import { entity, Reference } from "@deepkit/type";
import { FileRecord } from "src/file/file-record.entity";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

import { AppEntity } from "./entity";

@entity.name("file-record-to-tag")
export class FileRecordToTag extends AppEntity<FileRecordToTag> {
  file!: FileRecord & Reference;
  tag!: Tag & Reference;
}

export const entities = [User, FileRecord, Tag, FileRecordToTag];
