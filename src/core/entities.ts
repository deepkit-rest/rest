import { FileRecord } from "src/file/file-record.entity";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

import { FileRecordToTag } from "./entity-pivots";

export const entities = [User, FileRecord, Tag, FileRecordToTag];
