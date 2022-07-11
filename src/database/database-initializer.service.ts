import { Database } from "@deepkit/orm";

import { DatabaseConfig } from "./database.config";
import { InjectDatabase } from "./database.tokens";

export class DatabaseInitializer {
  constructor(
    private database: InjectDatabase,
    private config: Pick<DatabaseConfig, "logging">,
  ) {}

  async initialize(): Promise<Database> {
    if (this.config.logging) this.database.logger.enableLogging();
    return this.database;
  }
}
