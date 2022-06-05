import { is, uuid } from "@deepkit/type";
import { createReadStream } from "fs";
import { rm, stat, writeFile } from "fs/promises";
import { join } from "path";
import {
  FileEngine,
  FileEngineOptions,
  FileEngineRetrieveOptions,
} from "src/file-engine/file-engine.interface";
import { Readable } from "stream";

export class LocalFileEngine implements FileEngine {
  protected root!: string;

  async bootstrap(options: FileEngineOptions): Promise<void> {
    if (!is<LocalFileEngineOptions>(options))
      throw new Error("Invalid options");
    const stats = await stat(options.root);
    if (!stats.isDirectory()) throw new Error("Invalid root");
    this.root = options.root;
  }

  async store(source: Readable): Promise<string> {
    const key = uuid();
    await writeFile(join(this.root, key), source);
    return key;
  }

  async retrieve(
    key: string,
    options?: FileEngineRetrieveOptions,
  ): Promise<Readable> {
    const stream = createReadStream(join(this.root, key), options);
    await new Promise((resolve, reject) => {
      stream.once("readable", resolve).once("error", reject);
    });
    return stream;
  }

  async remove(key: string): Promise<void> {
    await rm(join(this.root, key));
  }
}

export interface LocalFileEngineOptions {
  root: string;
}
