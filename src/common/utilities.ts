export type PartialRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
