import { entity, Reference } from "@deepkit/type";
import { FileSystemRecord } from "src/file/file-system-record.entity";
import { Tag } from "src/tag/tag.entity";

import { AppEntity } from "./entity";

@entity.name("file-record-to-tag")
export class FileRecordToTag extends AppEntity<
  FileRecordToTag,
  "file" | "tag"
> {
  file!: FileSystemRecord & Reference;
  tag!: Tag & Reference;
}
