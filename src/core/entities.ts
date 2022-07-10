import { ClassType } from "@deepkit/core";
import { ReflectionClass } from "@deepkit/type";
import { FileRecord } from "src/file/file-record.entity";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

import { FileRecordToTag } from "./entity-pivots";

export const entities: ClassType[] = [User, FileRecord, Tag, FileRecordToTag];

// temporary workaround: reflection result will be cached. We must call
// `ReflectionClass.from()` directly before any other calls to ensure the
// correct result is cached.
// https://github.com/deepkit/deepkit-framework/issues/255
entities.forEach((entityType) => ReflectionClass.from(entityType));
