/* eslint-disable @typescript-eslint/no-unused-vars */
// Pipe input contains only strings.
export type UntypedRequest<T> = {
  [key in keyof T]: T[key] extends Array<infer V>
    ? string[]
    : T[key] extends Array<infer V> | undefined
    ? string[]
    : T[key] extends Array<infer V> | null
    ? string[]
    : string;
};
