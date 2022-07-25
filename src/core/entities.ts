import { FileSystemRecord } from "src/file/file-system-record.entity";
import { FileSystemTag } from "src/file/file-system-tag.entity";
import { User } from "src/user/user.entity";

import { FileSystemRecordToTag } from "./entity-pivots";

export const entities = [
  User,
  FileSystemRecord,
  FileSystemTag,
  FileSystemRecordToTag,
];
