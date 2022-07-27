import { FileEngine } from "src/file-engine/file-engine.interface";
import { PassThrough, Readable } from "stream";

export class FileChunkUploadManager {
  private recordsMap = new Map<string, ChunkRecord[]>();

  constructor(private engine: FileEngine) {}

  inspect(id: string): number[] {
    const records = this.getRecords(id);
    return records.map((r) => r.order);
  }

  async store(id: string, stream: Readable, order?: number): Promise<string> {
    const records = this.getRecords(id);
    const contentKey = await this.engine.store(stream);
    order ??=
      records.reduce((max, r) => (r.order > max ? r.order : max), 0) + 1;
    records.push({ contentKey, order });
    return contentKey;
  }

  async clear(id: string): Promise<void> {
    const records = this.getRecords(id);
    await Promise.all(records.map((r) => this.engine.remove(r.contentKey)));
    this.recordsMap.delete(id);
  }

  async merge(id: string): Promise<Readable> {
    const records = this.getRecords(id);
    records.sort((a, b) => a.order - b.order);
    const streamMerged = new PassThrough();
    for (const [index, record] of records.entries()) {
      const streamChunk = await this.engine.fetch(record.contentKey);
      await new Promise((resolve, reject) => {
        streamChunk.once("end", resolve);
        streamChunk.once("error", reject);
        streamChunk.pipe(streamMerged, { end: false });
      });
      const isLast = index === records.length - 1;
      if (isLast) streamMerged.end();
    }
    return streamMerged;
  }

  private getRecords(id: string) {
    const r = this.recordsMap.get(id) || [];
    this.recordsMap.set(id, r);
    return r;
  }
}

interface ChunkRecord {
  contentKey: string;
  order: number;
}
