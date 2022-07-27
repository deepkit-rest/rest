import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { CoreModuleConfig } from "./core.config";
import { entities } from "./entities";

export class SQLiteDatabase extends Database {
  constructor(url: CoreModuleConfig["databaseUrl"]) {
    super(new SQLiteDatabaseAdapter(url), entities);
  }
}
