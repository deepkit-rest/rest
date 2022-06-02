import { uuid } from "@deepkit/type";
import { createReadStream, existsSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { Readable } from "stream";

export interface FileEngine {
  store(source: Readable): Promise<string>;
  retrieve(ref: string): Promise<Readable>;
}

export class LocalFileEngine implements FileEngine {
  constructor(protected root: string) {
    if (!existsSync(root)) throw new Error(`Directory ${root} does not exist`);
  }

  async store(source: Readable): Promise<string> {
    const key = uuid();
    await writeFile(join(this.root, key), source);
    return key;
  }

  async retrieve(ref: string): Promise<Readable> {
    const stream = createReadStream(join(this.root, ref));
    await new Promise((resolve, reject) => {
      stream.once("readable", resolve).once("error", reject);
    });
    return stream;
  }
}
