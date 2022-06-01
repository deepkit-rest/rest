import { Readable } from "stream";

export interface FileEngine {
  store(source: Readable): Promise<string>;
  retrieve(ref: string): Promise<Readable>;
}
