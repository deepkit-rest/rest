import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { DatabaseModuleConfig } from "./database.module";

export abstract class AppDatabase extends Database {}

/**
 * @internal Use {@link AppDatabase} for dependency injection.
 */
export class SQLiteDatabase extends AppDatabase {
  override name = "default";
  constructor(
    url: DatabaseModuleConfig["url"],
    entities: DatabaseModuleConfig["entities"],
  ) {
    super(new SQLiteDatabaseAdapter(url), entities);
  }
}
