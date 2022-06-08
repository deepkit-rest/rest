export type PartialRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
