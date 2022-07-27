import { Database } from "@deepkit/orm";

import { DatabaseExtensionModuleConfig } from "./database-extension.config";
import { InjectDatabase } from "./database-tokens";

export class DatabaseInitializer {
  constructor(
    private database: InjectDatabase,
    private config: Pick<DatabaseExtensionModuleConfig, "logging">,
  ) {}

  async initialize(): Promise<Database> {
    if (this.config.logging) this.database.logger.enableLogging();
    return this.database;
  }
}
