import * as fs from 'fs';
import * as path from 'path';
import { INestApplication, Logger } from '@nestjs/common';
import { IKeyringPair } from '@polkadot/types/types';
import { ApiPromise } from '@polkadot/api';

import * as lib from '../src/utils/blockchain/web3';
import * as unique from '../src/utils/blockchain/unique';
import * as util from '../src/utils/blockchain/util';
import { UniqueExplorer } from '../src/utils/blockchain/util';
import { initApp, runMigrations } from './data';
import { EscrowService } from '../src/escrow/service';
import { UniqueEscrow } from '../src/escrow';
import { alias } from 'yargs';
import { MONEY_TRANSFER_STATUS } from '../src/escrow/constants';

describe('Escrow test', () => {
  jest.setTimeout(60 * 60 * 1000);
  const logger = new Logger();
  let app: INestApplication;
  let api: ApiPromise;
  let web3conn, web3;
  const cacheDir = path.join(__dirname, 'cache');

  beforeAll(async () => {
    app = await initApp();
    const config = app.get('CONFIG');
    await runMigrations(config);
    await app.init();
    web3conn = lib.connectWeb3(config.blockchain.testing.unique.wsEndpoint);
    api = await unique.connectApi(config.blockchain.testing.unique.wsEndpoint, false);
    web3 = web3conn.web3;
  });

  afterAll(async () => {
    await app.close();
    web3conn.provider.connection.close();
    await api.disconnect();
  });

  const clearCache = () => {
    for (let file of ['contract.json', 'collection.json']) {
      if (fs.existsSync(path.join(cacheDir, file))) fs.unlinkSync(path.join(cacheDir, file));
    }
  };

  const deployContract = async (config, admin: IKeyringPair) => {
    let cachedPath = path.join(cacheDir, 'contract.json'),
      cachedData: { contractAddress: string; contractOwnerSeed: string } = null;
    const readBCStatic = (filename) => fs.readFileSync(path.join(config.rootDir, '..', 'blockchain', filename)).toString();
    if (fs.existsSync(cachedPath)) {
      cachedData = JSON.parse(fs.readFileSync(cachedPath).toString());
      let balance = (await api.rpc.eth.getBalance(cachedData.contractAddress)).toBigInt();
      if (balance < 50n * lib.UNIQUE) {
        // balance to low
        clearCache();
        cachedData = null;
      }
    }
    if (cachedData !== null) {
      let contractOwner = web3.eth.accounts.privateKeyToAccount(cachedData.contractOwnerSeed);
      web3.eth.accounts.wallet.add(contractOwner.privateKey);
      let contract = new web3.eth.Contract(JSON.parse(readBCStatic('MarketPlace.abi')), cachedData.contractAddress);
      return { contract, contractOwner, helpers: lib.contractHelpers(web3, contractOwner.address) };
    }

    const contractOwner = await lib.createEthAccountWithBalance(api, web3);
    const contractAbi = new web3.eth.Contract(JSON.parse(readBCStatic('MarketPlace.abi')), undefined, {
      from: contractOwner.address,
      ...lib.GAS_ARGS,
    });
    const contract = await contractAbi
      .deploy({ data: readBCStatic('MarketPlace.bin') })
      .send({ from: contractOwner.address, gas: 10000000 });
    await contract.methods.setEscrow(contractOwner.address, true).send({ from: contractOwner.address });
    const helpers = lib.contractHelpers(web3, contractOwner.address);
    await helpers.methods.toggleSponsoring(contract.options.address, true).send({ from: contractOwner.address });
    await helpers.methods.setSponsoringRateLimit(contract.options.address, 1).send({ from: contractOwner.address });
    await lib.transferBalanceToEth(api, admin, contract.options.address);

    fs.writeFileSync(
      cachedPath,
      JSON.stringify({ contractOwnerSeed: contractOwner.privateKey, contractAddress: contract.options.address }),
    );

    return { contractOwner, contract, helpers };
  };

  const createCollection = async (explorer: UniqueExplorer, admin: IKeyringPair, contractOwner: string) => {
    let cachedPath = path.join(cacheDir, 'collection.json'),
      cachedData: { collectionId: number } = null;
    if (fs.existsSync(cachedPath)) {
      cachedData = JSON.parse(fs.readFileSync(cachedPath).toString());
      let collection = await api.query.common.collectionById(cachedData.collectionId);
      if (collection.toHuman() === null) {
        // no more collection
        cachedData = null;
      }
    }
    if (cachedData !== null) {
      return {
        collectionId: cachedData.collectionId,
        evmCollection: lib.createEvmCollection(cachedData.collectionId, contractOwner, web3),
      };
    }

    const collectionId = await explorer.createCollection({ name: 'test', description: 'test collection', tokenPrefix: 'test' });
    await unique.signTransaction(
      admin,
      api.tx.unique.setCollectionLimits(collectionId, { sponsorApproveTimeout: 1 }),
      'api.tx.unique.setCollectionLimits',
    );
    const evmCollection = lib.createEvmCollection(collectionId, contractOwner, web3);
    await unique.signTransaction(
      admin,
      api.tx.unique.setCollectionSponsor(collectionId, admin.address),
      'api.tx.unique.setCollectionSponsor',
    );
    await lib.transferBalanceToEth(api, admin, lib.subToEth(admin.address));
    await unique.signTransaction(admin, api.tx.unique.confirmSponsorship(collectionId), 'api.tx.unique.confirmSponsorship');

    fs.writeFileSync(cachedPath, JSON.stringify({ collectionId }));

    return { collectionId, evmCollection };
  };

  it('With escrow', async () => {
    const PRICE = 2_000_000_000_000n; // 2 KSM
    const KYC_PRICE = 1_000n;
    const config = app.get('CONFIG');
    let blocks = {
      start: 0,
      latest: (await api.rpc.chain.getHeader()).number.toNumber(),
      async updateLatest() {
        this.start = this.latest;
        this.latest = (await api.rpc.chain.getHeader()).number.toNumber();
      },
    };

    const alice = util.privateKey(config.blockchain.testing.escrowSeed);
    const explorer = new UniqueExplorer(api, alice);

    const { contract, contractOwner, helpers } = await deployContract(config, alice);

    const { collectionId, evmCollection } = await createCollection(explorer, alice, contractOwner.address);

    config.blockchain.testing.unique = {
      ...config.blockchain.testing.unique,
      contractOwnerSeed: contractOwner.privateKey,
      contractAddress: contract.options.address,
      collectionIds: [collectionId],
    };

    const service = app.get(EscrowService, { strict: false });
    let escrow = new UniqueEscrow(config, service, UniqueEscrow.MODE_TESTING);
    await escrow.init();

    const workEscrow = async (fromBlock: number, toBlock: number) => {
      for (let block = fromBlock; block <= toBlock; block++) {
        await escrow.processBlock(block);
      }
    };

    const seller = util.privateKey(`//Seller/${Date.now()}`);
    const buyer = util.privateKey(`//Buyer/${Date.now()}`);

    // KYC action (transfer to escrow, kusama escrow daemon perform this call normally)
    await blocks.updateLatest();
    await service.modifyContractBalance(KYC_PRICE, seller.address, blocks.latest, config.blockchain.testing.kusama.network);

    await service.modifyContractBalance(PRICE, alice.address, blocks.latest, config.blockchain.testing.kusama.network);
    await workEscrow(blocks.start, blocks.latest);

    //await contract.methods.depositKSM(PRICE, lib.subToEth(alice.address)).send({ from: contractOwner.address, ...lib.GAS_ARGS });
    await lib.executeEthTxOnSub(web3, api, alice, contract, (m) => m.withdrawAllKSM(lib.subToEth(alice.address)));

    await blocks.updateLatest();

    // Escrow must register deposit for seller
    await workEscrow(blocks.start, blocks.latest);

    // Seller must be added to contract allow list after KYC transfer
    expect((await api.query.evmContractHelpers.allowlist(contract.options.address, lib.subToEth(seller.address))).toJSON()).toBe(true);

    await expect(await contract.methods.balanceKSM(lib.subToEth(seller.address)).call()).toEqual(KYC_PRICE.toString());

    // Escrow must set finished status for transfer
    expect(await service.getPendingContractBalance(config.blockchain.testing.kusama.network)).toBeUndefined();

    const sellTokenId = (await explorer.createToken({ collectionId, owner: seller.address })).tokenId;
    const cancelTokenId = (await explorer.createToken({ collectionId, owner: seller.address })).tokenId;

    // To transfer item to matcher it first needs to be transferred to EVM account of seller
    for (let tokenId of [sellTokenId, cancelTokenId]) {
      await unique.signTransaction(
        seller,
        api.tx.unique.transfer(util.normalizeAccountId({ Ethereum: lib.subToEth(seller.address) }), collectionId, tokenId, 1),
        'api.tx.unique.transfer',
      );
      await expect(util.normalizeAccountId(await explorer.getTokenOwner(collectionId, tokenId))).toEqual({
        Ethereum: lib.subToEthLowercase(seller.address),
      });
    }

    const addAsk = async (tokenId) => {
      // Give contract permissions to manipulate token
      let res = await lib.executeEthTxOnSub(web3, api, seller, evmCollection, (m) => m.approve(contract.options.address, tokenId));
      await expect(res.success).toBe(true);
      // Add ask to contract
      res = await lib.executeEthTxOnSub(web3, api, seller, contract, (m) =>
        m.addAsk(PRICE, '0x0000000000000000000000000000000000000001', evmCollection.options.address, tokenId),
      );
      await expect(res.success).toBe(true);

      // Token is transferred to matcher
      await expect(util.normalizeAccountId(await explorer.getTokenOwner(collectionId, tokenId))).toEqual({
        Ethereum: contract.options.address.toLowerCase(),
      });

      // Escrow must create new contract_ask for this token
      await blocks.updateLatest();
      await workEscrow(blocks.start, blocks.latest);

      let activeAsk = await service.getActiveAsk(collectionId, tokenId, config.blockchain.testing.unique.network);
      expect(activeAsk).not.toBeUndefined();
    };

    // Cancelled ask
    {
      await addAsk(cancelTokenId);

      // Cancel ask on contract
      let res = await lib.executeEthTxOnSub(web3, api, seller, contract, (m) => m.cancelAsk(evmCollection.options.address, cancelTokenId));
      await expect(res.success).toBe(true);

      // Escrow must set contract_ask status for this token to cancelled
      await blocks.updateLatest();
      await workEscrow(blocks.start, blocks.latest);

      let activeAsk = await service.getActiveAsk(collectionId, cancelTokenId, config.blockchain.testing.unique.network);
      expect(activeAsk).toBeUndefined();

      // Token is transferred back to previous owner (seller)
      await expect(util.normalizeAccountId(await explorer.getTokenOwner(collectionId, cancelTokenId))).toEqual(
        util.normalizeAccountId({ Ethereum: lib.subToEth(seller.address) }),
      );
    }

    // Ask
    {
      await addAsk(sellTokenId);
    }

    // Give buyer KSM
    await blocks.updateLatest();
    await service.modifyContractBalance(PRICE, buyer.address, blocks.latest, config.blockchain.testing.kusama.network);

    // Escrow must register deposit for buyer
    await workEscrow(blocks.start, blocks.latest);

    // Buyer must be added to contract allow list after deposit
    expect((await api.query.evmContractHelpers.allowlist(contract.options.address, lib.subToEth(buyer.address))).toJSON()).toBe(true);

    // Buy
    {
      await expect(await contract.methods.balanceKSM(lib.subToEth(seller.address)).call()).toEqual(KYC_PRICE.toString());
      await expect(await contract.methods.balanceKSM(lib.subToEth(buyer.address)).call()).toEqual(PRICE.toString());

      await lib.executeEthTxOnSub(web3, api, buyer, contract, (m) =>
        m.buyKSM(evmCollection.options.address, sellTokenId, lib.subToEth(buyer.address), lib.subToEth(buyer.address)),
      );

      // Price is removed from buyer balance, and added to seller
      await expect(await contract.methods.balanceKSM(lib.subToEth(buyer.address)).call()).toEqual('0');
      await expect(await contract.methods.balanceKSM(lib.subToEth(seller.address)).call()).toEqual((PRICE + KYC_PRICE).toString());

      // Escrow withdraw balance from contract and send KSM to seller
      let activeWithdraw = await service.getPendingKusamaWithdraw(config.blockchain.testing.kusama.network);
      await expect(await service.updateMoneyTransferStatus(activeWithdraw.id, MONEY_TRANSFER_STATUS.COMPLETED));
      expect(activeWithdraw.extra.address === alice.address).toBe(true);

      // Process buyKSM with escrow
      await blocks.updateLatest();
      await workEscrow(blocks.start, blocks.latest);

      // TODO: check trade table

      // Buyer
      await expect(await contract.methods.balanceKSM(lib.subToEth(seller.address)).call()).toEqual(KYC_PRICE.toString());
      activeWithdraw = await service.getPendingKusamaWithdraw(config.blockchain.testing.kusama.network);
      await expect(await service.updateMoneyTransferStatus(activeWithdraw.id, MONEY_TRANSFER_STATUS.COMPLETED));

      let checkTrade = await service.getTradeSellerAndBuyer(buyer.address, seller.address, activeWithdraw.amount);

      expect(activeWithdraw.extra.address === seller.address.toString()).toBe(true);
      expect(activeWithdraw.extra.address === checkTrade.address_seller).toBe(true);
      expect(activeWithdraw.amount === checkTrade.price).toBe(true);
    }

    // Token is transferred to evm account of buyer
    await expect(util.normalizeAccountId(await explorer.getTokenOwner(collectionId, sellTokenId))).toEqual(
      util.normalizeAccountId({ Ethereum: lib.subToEthLowercase(buyer.address) }),
    );

    // Transfer token to substrate side of buyer
    await unique.signTransaction(
      buyer,
      api.tx.unique.transferFrom(
        util.normalizeAccountId({ Ethereum: lib.subToEth(buyer.address) }),
        util.normalizeAccountId({ Substrate: buyer.address }),
        collectionId,
        sellTokenId,
        1,
      ),
      'api.tx.unique.transferFrom',
    );

    // Token is transferred to substrate account of buyer, seller received funds
    await expect(util.normalizeAccountId(await explorer.getTokenOwner(collectionId, sellTokenId))).toEqual(
      util.normalizeAccountId({ Substrate: buyer.address }),
    );
  });
});
