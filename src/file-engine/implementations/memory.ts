import { Readable } from "stream";
import * as uuid from "uuid";

import { FileEngine } from "../file-engine.interface";

export class MemoryFileEngine implements FileEngine {
  protected storage = new Map<string, Buffer>();

  async bootstrap(): Promise<void> {}

  async store(source: Readable): Promise<string> {
    const buffer = await stream2buffer(source);
    const key = uuid.v4();
    this.storage.set(key, buffer);
    return key;
  }

  async retrieve(key: string): Promise<Readable> {
    const buffer = this.storage.get(key);
    if (!buffer) throw new Error("File not found");
    return buffer2stream(buffer);
  }
}

/**
 * @see https://stackoverflow.com/a/67729663/14952417
 */
async function stream2buffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
}

async function buffer2stream(buffer: Buffer): Promise<Readable> {
  const stream = Readable.from(buffer);
  await new Promise((resolve, reject) => {
    stream.once("readable", resolve);
    stream.once("error", reject);
  });
  return stream;
}
