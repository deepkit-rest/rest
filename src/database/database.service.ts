import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { DatabaseConfig, DatabaseEntitySet } from "./database.module";

/**
 * Application bootstrap fails when using {@link Database} as injection token
 * and enabling framework debug mode (bug). This is a temporary workaround.
 */
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
