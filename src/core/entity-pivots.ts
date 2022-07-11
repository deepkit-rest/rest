import { entity, Reference } from "@deepkit/type";
import { Entity } from "src/common/entity";
import { FileRecord } from "src/file/file-record.entity";
import { Tag } from "src/tag/tag.entity";

@entity.name("file-record-to-tag")
export class FileRecordToTag extends Entity<FileRecordToTag> {
  file!: FileRecord & Reference;
  tag!: Tag & Reference;
}
