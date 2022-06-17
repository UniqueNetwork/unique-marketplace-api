import { Logger, ConsoleLogger } from '@nestjs/common';
import { ExtrinsicSubmitter } from '../../src/auction/services/helpers/extrinsic-submitter';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { stringify } from '@polkadot/util';

const senderSeed = '//Alice';
const recipientSeed = 'cute quantum six actress hill rebel symptom guitar learn blush advice gadget';
const wsEndpoint = 'ws://localhost:9944';
const keyringType = 'sr25519';

const isPassTest = true;

const getBalance = (api: ApiPromise, keyringPair: KeyringPair): Promise<bigint> => {
  return api.query.system.account(keyringPair.address).then((a) => a.data.free.toBigInt());
};

const buildTransferMaker =
  (api: ApiPromise, extrinsicSubmitter: ExtrinsicSubmitter) =>
  async (from: KeyringPair, to: KeyringPair, amount: bigint, isKeepAlive: boolean): Promise<any> => {
    const method = isKeepAlive ? 'transferKeepAlive' : 'transfer';
    const tx = await api.tx.balances[method](to.address, amount)
      .signAsync(from)
      .then((tx) => tx.toJSON());

    return extrinsicSubmitter.submit(api, tx);
  };

describe(ExtrinsicSubmitter.name, () => {
  let sender: KeyringPair;
  let recipient: KeyringPair;

  let api: ApiPromise;
  let extrinsicSubmitter: ExtrinsicSubmitter;

  let minAmount: bigint;

  beforeAll(async () => {
    Logger.overrideLogger(new ConsoleLogger('jest', { logLevels: ['log', 'error', 'warn', 'debug', 'verbose'] }));

    extrinsicSubmitter = new ExtrinsicSubmitter();

    const provider = new WsProvider(wsEndpoint);
    api = await ApiPromise.create({ provider });
    const ss58Format = api.registry.chainSS58;

    sender = new Keyring({ type: keyringType, ss58Format }).addFromUri(senderSeed);
    recipient = new Keyring({ type: keyringType, ss58Format }).addFromUri(recipientSeed);

    console.log(`sender - ${sender.address}`);
    console.log(`recipient - ${recipient.address}`);

    minAmount = api.consts.balances.existentialDeposit.toBigInt();
    if (!minAmount) {
      minAmount = (await getBalance(api, sender)) / 1000n;
    }
  });

  afterAll(async () => {
    await api.disconnect();
  });

  it(`Balance transfers by ${ExtrinsicSubmitter.name} pass and fails as expected`, async () => {
    if (isPassTest) {
      console.warn(`This test is not free, change "isPassTest" const and rerun, returning`);
      return;
    }

    let recipientBalance = await getBalance(api, recipient);
    if (recipientBalance > minAmount) {
      console.warn(`for test case recipient balance should be less then ED (${minAmount}), returning`);

      return;
    }

    const senderStartBalance = await getBalance(api, sender);
    const makeTransfer = buildTransferMaker(api, extrinsicSubmitter);

    const toRecipientResult = makeTransfer(sender, recipient, minAmount * 10n, true);
    await expect(toRecipientResult).resolves.toMatchObject({
      isSucceed: true,
      blockNumber: expect.any(BigInt),
    });
    console.log(`sender => ${minAmount * 10n} => recipient: ${stringify(await toRecipientResult)}`);

    recipientBalance = await getBalance(api, recipient);
    const failNotEnoughPromise = makeTransfer(recipient, sender, recipientBalance * 2n, false);
    await expect(failNotEnoughPromise).rejects.toThrowError();
    console.log(`sender => ${recipientBalance + 1n} => recipient: failed as expected`);

    const failKeepAlivePromise = makeTransfer(recipient, sender, recipientBalance * 2n, true);
    await expect(failKeepAlivePromise).rejects.toThrowError();
    console.log(`sender => ${recipientBalance - minAmount + 1n} => recipient: failed as expected`);

    const transferPartResult = makeTransfer(recipient, sender, minAmount, true);
    await expect(transferPartResult).resolves.toMatchObject({
      isSucceed: true,
      blockNumber: expect.any(BigInt),
    });
    console.log(`recipient => ${minAmount} => sender: ${stringify(await transferPartResult)}`);

    const txTransferAll = await api.tx.balances
      .transferAll(sender.address, false)
      .signAsync(recipient)
      .then((tx) => tx.toJSON());

    const transferAllResult = extrinsicSubmitter.submit(api, txTransferAll);

    await expect(transferAllResult).resolves.toMatchObject({
      isSucceed: true,
      blockNumber: expect.any(BigInt),
    });
    console.log(`recipient => all => sender: ${stringify(await transferAllResult)}`);

    const senderEndBalance = await getBalance(api, sender);

    console.log(`This test run costs you ${senderStartBalance - senderEndBalance}`);
  }, 200_000);
});
