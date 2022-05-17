import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { AppDatabase, SQLiteDatabase } from "./database.service";

export class DatabaseModuleConfig {
  url?: string;
  entities: ClassType[] = [];
}

export class DatabaseModule extends createModule({
  providers: [{ provide: AppDatabase, useClass: SQLiteDatabase }],
  exports: [AppDatabase],
  config: DatabaseModuleConfig,
}) {}
