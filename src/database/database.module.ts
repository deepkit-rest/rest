import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { Database, DatabaseSession } from "@deepkit/orm";

import { DatabaseConfig } from "./database.config";
import { DatabaseListener } from "./database.listener";
import { SQLiteDatabase } from "./database.provider";
import { DatabaseInitializer } from "./database-initializer.service";

export class DatabaseModule extends createModule(
  {
    providers: [
      { provide: Database, useClass: SQLiteDatabase },
      {
        provide: DatabaseSession,
        useFactory: (db: Database) => db.createSession(),
        scope: "http",
      },
      DatabaseInitializer,
    ],
    exports: [Database, DatabaseSession],
    listeners: [DatabaseListener],
    config: DatabaseConfig,
  },
  "database",
) {
  private entities = new DatabaseEntitySet();

  override process(): void {
    this.addProvider({ provide: DatabaseEntitySet, useValue: this.entities });
  }

  withEntities(...entities: ClassType[]): this {
    entities.forEach((entity) => this.entities.add(entity));
    return this;
  }
}

export class DatabaseEntitySet extends Set<ClassType> {}
