import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { CoreConfig } from "./core.config";
import { entities } from "./entities";

export class SQLiteDatabase extends Database {
  constructor(url: CoreConfig["databaseUrl"]) {
    super(new SQLiteDatabaseAdapter(url), entities);
  }
}
