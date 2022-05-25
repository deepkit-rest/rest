import { EventDispatcher } from "@deepkit/event";
import { Database } from "@deepkit/orm";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { DatabaseConfig } from "./database.config";
import { DatabaseEntitySet } from "./database.module";
import { forwardDatabaseEvents } from "./database-event";

/**
 * Application bootstrap fails when using {@link Database} as injection token
 * and enabling framework debug mode (bug). This is a temporary workaround.
 *
 * Will be fixed in the next release.
 */
export abstract class AppDatabase extends Database {}

/**
 * @internal Use {@link AppDatabase} for dependency injection.
 */
export class SQLiteDatabase extends AppDatabase {
  override name = "default";
  constructor(
    url: DatabaseConfig["url"],
    entities: DatabaseEntitySet,
    eventDispatcher: EventDispatcher,
  ) {
    super(new SQLiteDatabaseAdapter(url), [...entities]);
    forwardDatabaseEvents(this, eventDispatcher);
  }
}
