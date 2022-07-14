export type TxArgs = Record<string, string | Record<string, any>>;

export interface TxInfo {
  isSigned: boolean;
  signerAddress: string;
  method: string;
  section: string;
  args: TxArgs;
}
