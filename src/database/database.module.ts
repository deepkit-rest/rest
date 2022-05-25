import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { Inject } from "@deepkit/injector";
import * as orm from "@deepkit/orm"; // We have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release.

import { DatabaseListener } from "./database.listener";
import { AppDatabase, SQLiteDatabase } from "./database.provider";

// Temporary workaround due to a bug related to @deepkit/injector, will be
// fixed in the next release.
export const DATABASE_SESSION = "token:database-session"; // type `symbol` is missing in type `ExportType`, so we use string instead
export type InjectDatabaseSession = Inject<
  orm.DatabaseSession<orm.DatabaseAdapter>,
  typeof DATABASE_SESSION
>;

export class DatabaseConfig {
  url: string = ":memory:";
}

export class DatabaseModule extends createModule(
  {
    providers: [
      { provide: AppDatabase, useClass: SQLiteDatabase },
      {
        provide: DATABASE_SESSION,
        useFactory: (db: AppDatabase) => db.createSession(),
        scope: "http",
      },
    ],
    listeners: [DatabaseListener],
    exports: [AppDatabase, DATABASE_SESSION],
    config: DatabaseConfig,
  },
  "database",
) {
  protected entities = new DatabaseEntitySet();
  withEntities(...entities: ClassType[]): this {
    entities.forEach((entity) => this.entities.add(entity));
    return this;
  }

  override process(): void {
    this.addProvider({ provide: DatabaseEntitySet, useValue: this.entities });
  }
}

export class DatabaseEntitySet extends Set<ClassType> {}
