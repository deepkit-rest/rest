import { Readable } from "stream";

// prettier-ignore
export abstract class FileEngine<Options extends object = object> {
  abstract options: Options;
  abstract bootstrap(): Promise<void>;
  abstract store(source: Readable): Promise<string>;
  abstract retrieve(key: string, options?: FileEngineRetrieveOptions): Promise<Readable>;
  abstract remove(key: string): Promise<void>;
}

export interface FileEngineClass<Options extends object> {
  new (options: Options): FileEngine<Options>;
}

export interface FileEngineRetrieveOptions {
  start?: number;
  end?: number;
}
