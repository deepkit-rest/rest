import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { DatabaseConfig } from "./database.config";
import { DatabaseEntitySet } from "./database.module";

export class SQLiteDatabase extends Database {
  override name = "default";

  constructor(url: DatabaseConfig["url"], entities: DatabaseEntitySet) {
    super(new SQLiteDatabaseAdapter(url), [...entities]);
  }
}
