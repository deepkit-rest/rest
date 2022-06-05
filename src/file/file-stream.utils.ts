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
}
