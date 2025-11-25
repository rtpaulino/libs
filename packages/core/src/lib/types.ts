/* eslint-disable @typescript-eslint/no-explicit-any */
export type Nullable<T> = T | null | undefined;

export type Logger = {
  log(message: any, ...optionalParams: any[]): any;
  error(message: any, ...optionalParams: any[]): any;
  warn(message: any, ...optionalParams: any[]): any;
  debug?(message: any, ...optionalParams: any[]): any;
};
