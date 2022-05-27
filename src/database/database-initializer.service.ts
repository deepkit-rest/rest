import { EventDispatcher } from "@deepkit/event";
import { SQLiteDatabaseAdapter } from "@deepkit/sqlite";

import { DatabaseConfig } from "./database.config";
import { InjectDatabase } from "./database.tokens";
import { forwardDatabaseEvents } from "./database-event";

export class DatabaseInitializer {
  constructor(
    private database: InjectDatabase,
    private config: Pick<DatabaseConfig, "logging">,
    private eventDispatcher: EventDispatcher,
  ) {}

  async initialize(): Promise<void> {
    await this.fixConnectionLogger();
    if (this.config.logging) this.database.logger.enableLogging();
    forwardDatabaseEvents(this.database, this.eventDispatcher);
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
    const adapter = this.database.adapter as SQLiteDatabaseAdapter;
    const connection = await adapter.connectionPool.getConnection();
    connection["logger"] = this.database.logger;
    connection.release();
  }
}
