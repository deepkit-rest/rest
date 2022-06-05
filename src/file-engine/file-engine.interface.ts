import { Readable } from "stream";

export abstract class FileEngine {
  abstract bootstrap(options: FileEngineOptions): Promise<void>;

  abstract store(source: Readable): Promise<string>;

  abstract retrieve(
    key: string,
    options?: FileEngineRetrieveOptions,
  ): Promise<Readable>;

  abstract remove(key: string): Promise<void>;
}

export interface FileEngineOptions extends Record<string, unknown> {}

export interface FileEngineClass {
  new (): FileEngine;
}

export interface FileEngineRetrieveOptions {
  start?: number;
  end?: number;
}
