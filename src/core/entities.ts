import { ClassType } from "@deepkit/core";
import { FileRecord } from "src/file/file-record.entity";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

import { FileRecordToTag } from "./entity-pivots";

export const entities: ClassType[] = [User, FileRecord, Tag, FileRecordToTag];
