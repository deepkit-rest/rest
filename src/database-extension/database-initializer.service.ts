import { Database } from "@deepkit/orm";

import { DatabaseExtensionConfig } from "./database-extension.config";
import { InjectDatabase } from "./database-tokens";

export class DatabaseInitializer {
  constructor(
    private database: InjectDatabase,
    private config: Pick<DatabaseExtensionConfig, "logging">,
  ) {}

  async initialize(): Promise<Database> {
    if (this.config.logging) this.database.logger.enableLogging();
    return this.database;
  }
}
