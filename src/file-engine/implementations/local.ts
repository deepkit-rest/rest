import { uuid } from "@deepkit/type";
import { createReadStream } from "fs";
import { rm, stat, writeFile } from "fs/promises";
import { join } from "path";
import {
  FileEngine,
  FileEngineRetrieveOptions,
} from "src/file-engine/file-engine.interface";
import { Readable } from "stream";

export class LocalFileEngine implements FileEngine<LocalFileEngineOptions> {
  protected root!: string;

  constructor(public options: LocalFileEngineOptions) {}

  async bootstrap(): Promise<void> {
    const stats = await stat(this.options.root);
    if (!stats.isDirectory()) throw new Error("Invalid root");
    this.root = this.options.root;
  }

  async store(source: Readable): Promise<string> {
    const key = uuid();
    await writeFile(join(this.root, key), source);
    return key;
  }

  async fetch(
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
