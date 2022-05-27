import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release

import { DatabaseConfig } from "./database.config";
import { DatabaseListener } from "./database.listener";
import { SQLiteDatabase } from "./database.provider";
import {
  DATABASE,
  DATABASE_SESSION,
  DatabaseFactoryToken,
} from "./database.tokens";
import { DatabaseInitializer } from "./database-initializer.service";

export class DatabaseModule extends createModule(
  {
    providers: [
      { provide: DATABASE, useClass: SQLiteDatabase },
      { provide: DatabaseFactoryToken, useExisting: DATABASE },
      {
        provide: DATABASE_SESSION,
        useFactory: (db: DatabaseFactoryToken) =>
          (db as orm.Database).createSession(),
        scope: "http",
      },
      DatabaseInitializer,
    ],
    listeners: [DatabaseListener],
    exports: [DATABASE, DATABASE_SESSION],
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
