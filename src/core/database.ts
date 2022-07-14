import { ClassType } from "@deepkit/core";
import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";
import { FileRecord } from "src/file/file-record.entity";
import { Tag } from "src/tag/tag.entity";
import { User } from "src/user/user.entity";

import { CoreConfig } from "./core.config";
import { FileRecordToTag } from "./entity-pivots";

export const entities: ClassType[] = [User, FileRecord, Tag, FileRecordToTag];

export class SQLiteDatabase extends Database {
  constructor(url: CoreConfig["databaseUrl"]) {
    super(new SQLiteDatabaseAdapter(url), [...entities]);
  }
}
