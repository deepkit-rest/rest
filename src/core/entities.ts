import { FileSystemRecord } from "src/file/file-system-record.entity";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

import { FileRecordToTag } from "./entity-pivots";

export const entities = [User, FileSystemRecord, Tag, FileRecordToTag];
