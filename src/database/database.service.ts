import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { DatabaseConfig } from "./database.module";
import { DatabaseEntitySet } from "./database.providers";

export abstract class AppDatabase extends Database {}

/**
 * @internal Use {@link AppDatabase} for dependency injection.
 */
export class SQLiteDatabase extends AppDatabase {
  override name = "default";
  constructor(url: DatabaseConfig["url"], entities: DatabaseEntitySet) {
    super(new SQLiteDatabaseAdapter(url), [...entities]);
  }
}
