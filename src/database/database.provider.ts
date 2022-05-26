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
    logging: DatabaseConfig["logging"],
    entities: DatabaseEntitySet,
    eventDispatcher: EventDispatcher,
  ) {
    super(new SQLiteDatabaseAdapter(url), [...entities]);
    forwardDatabaseEvents(this, eventDispatcher);
    this.fixConnectionLogger();
    if (logging) this.logger.enableLogging();
  }

  /**
   * Temporary workaround for SQLite connection logger.
   *
   * SQLite uses single connection, thus once a connection is created, all the
   * following operations will reuse that connection.
   *
   * The first connection is created during migration, which accidentally
   * doesn't have access to our logger and created a new one, thus all the
   * operations will not use our logger.
   *
   * Should be removed once fixed.
   */
  private async fixConnectionLogger() {
    const adapter = this.adapter as SQLiteDatabaseAdapter;
    const connection = await adapter.connectionPool.getConnection();
    connection["logger"] = this.logger;
    connection.release();
  }
}
