import { EscrowService } from './service';
import * as logging from '../utils/logging';
import { delay } from '../utils/delay';

export class Escrow {
  static MODE_PROD = 'prod';
  static MODE_TESTING = 'testing';
  api;
  admin;
  configObj;
  configMode;
  store;
  initialized = false;
  service: EscrowService;
  SECTION_TIMESTAMP = 'timestamp';

  constructor(config, service: EscrowService, mode = Escrow.MODE_PROD) {
    this.configObj = config;
    this.service = service;
    this.configMode = mode;

    this.store = {
      currentBlock: 0,
      latestBlock: 0,
    };
  }

  config(path, defaultVal = null) {
    const getOption = (path) => {
      let val = this.configObj;
      for (const key of path.split('.')) {
        val = val[key];
      }
      return val;
    };
    const defaultOption = getOption(`blockchain.${path}`);
    const val = typeof defaultOption !== 'undefined' ? defaultOption : defaultVal;
    if (this.configMode === Escrow.MODE_PROD) return val;
    const testingVal = getOption(`blockchain.testing.${path}`);
    return typeof testingVal !== 'undefined' ? testingVal : val;
  }

  async init() {
    throw Error('NotImplemented');
  }

  async destroy() {
    throw Error('NotImplemented');
  }

  async connectApi() {
    throw Error('NotImplemented');
  }

  isSuccessfulExtrinsic(eventRecords, extrinsicIndex) {
    const events = eventRecords
      .filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex))
      .map(({ event }) => `${event.section}.${event.method}`);

    return events.includes('system.ExtrinsicSuccess');
  }

  async getLatestBlockNumber() {
    return (await this.api.rpc.chain.getHeader()).number.toNumber();
  }

  prepareLatestBlock(blockNum) {
    return blockNum;
  }

  async subscribe() {
    await this.api.rpc.chain.subscribeNewHeads((lastHeader) => {
      this.store.latestBlock = this.prepareLatestBlock(lastHeader.number.toNumber());
      if (lastHeader.number % 100 === 0) logging.log(`New block #${lastHeader.number}`);
    });
  }

  getNetwork(): string {
    throw Error('NotImplemented');
  }

  async beforeBlockScan(): Promise<void> {
    throw Error('NotImplemented: beforeBlockScan');
  }

  async scanBlock(blockNum: bigint | number, force = false) {
    const network = this.getNetwork();
    if (!force && (await this.service.isBlockScanned(blockNum, network))) return; // Block already scanned

    await this.beforeBlockScan();

    const blockHash = await this.api.rpc.chain.getBlockHash(blockNum);

    const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
    const allRecords = await this.api.query.system.events.at(blockHash);

    let timestamp = null;

    for (const [extrinsicIndex, ex] of signedBlock.block.extrinsics.entries()) {
      const isSuccess = this.isSuccessfulExtrinsic(allRecords, extrinsicIndex);
      if (ex.method.section === this.SECTION_TIMESTAMP && ex.method.method === 'set') {
        timestamp = ex.method.toJSON().args.now;
        continue;
      }

      const extrinsicEvents = allRecords.filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex)).map((e) => e.toHuman());

      await this.extractBlockData(blockNum, isSuccess, ex, extrinsicEvents);
    }
    if (timestamp !== null) await this.service.addBlock(blockNum, timestamp, network);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extractBlockData(blockNum, isSuccess, rawExtrinsic, events) {
    throw Error('NotImplemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async processBlock(blockNum, force = false) {
    throw Error('NotImplemented');
  }

  greaterThenZero(val) {
    return val > 0 ? val : 0;
  }

  getStartFromBlock(): number | string {
    return 1;
  }

  async getStartBlock() {
    const startFromBlock = this.getStartFromBlock();
    if (startFromBlock === 'latest') return this.greaterThenZero((await this.getLatestBlockNumber()) - 10);
    const latestBlock = await this.service.getLastScannedBlock(this.getNetwork());
    if (latestBlock?.block_number) return parseInt(latestBlock.block_number);
    if (startFromBlock === 'current') return this.greaterThenZero((await this.getLatestBlockNumber()) - 10);
    return parseInt(`${startFromBlock}`);
  }

  async mainLoop() {
    while (true) {
      const lastLatest = this.store.latestBlock;
      if (this.store.currentBlock % 10 === 0) logging.log(`Scanning block #${this.store.currentBlock}`);
      await this.processBlock(this.store.currentBlock);
      this.store.currentBlock += 1;
      if (this.store.currentBlock <= lastLatest) continue;
      while (lastLatest === this.store.latestBlock) await delay(100);
    }
  }

  async work() {
    throw Error('NotImplemented');
  }
}
