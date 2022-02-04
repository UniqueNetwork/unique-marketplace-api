export type TxArgs = Record<string, string | Record<string, any>>;

export interface TxInfo {
  address: string;
  method: string;
  section: string;
  args: TxArgs;
}