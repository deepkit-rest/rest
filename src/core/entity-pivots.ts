import { entity, Reference } from "@deepkit/type";
import { FileSystemRecord } from "src/file/file-system-record.entity";
import { FileSystemTag } from "src/file/file-system-tag.entity";

import { AppEntity } from "./entity";

@entity.name("file-system-record-to-tag")
export class FileSystemRecordToTag extends AppEntity<FileSystemRecordToTag> {
  file!: FileSystemRecord & Reference;
  tag!: FileSystemTag & Reference;
  constructor(input: Pick<FileSystemRecordToTag, "file" | "tag">) {
    super();
    this.assign(input);
  }
}
