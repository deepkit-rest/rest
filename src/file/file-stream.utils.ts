import { createHash } from "crypto";
import { Readable } from "stream";

export class FileStreamUtils {
  static async hash(source: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = source.pipe(createHash("md5"));
      stream.once("finish", () => resolve(stream.read().toString("hex")));
      stream.once("error", (err) => reject(err));
    });
  }

  static async size(source: Readable): Promise<number> {
    return new Promise((resolve, reject) => {
      let length = 0;
      source.on("data", (chunk) => {
        length += chunk.length;
      });
      source.on("end", () => resolve(length));
      source.on("error", (err) => reject(err));
    });
  }
}
