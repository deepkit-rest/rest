import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { Inject } from "@deepkit/injector";
import * as orm from "@deepkit/orm"; // We have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release.

import { DatabaseConfig } from "./database.config";
import { DatabaseListener } from "./database.listener";
import { SQLiteDatabase } from "./database.provider";

// temporary workaround: when database is provided using a class extending
// `Database`, and some entities is extending a base class and passing generic
// type arguments, the debugger will fail to work
// https://github.com/deepkit/deepkit-framework/issues/241
export const DATABASE = "token:database"; // temporary workaround: type `symbol` is missing in type `ExportType`, so we use string instead
class DatabaseFactoryToken {} // temporary workaround for https://github.com/deepkit/deepkit-framework/issues/240
export type InjectDatabase = Inject<orm.Database, typeof DATABASE>;

// temporary workaround: `Database` cannot be used as a token when framework
// debug mode is enabled
export const DATABASE_SESSION = "token:database-session"; // temporary workaround: type `symbol` is missing in type `ExportType`, so we use string instead
export type InjectDatabaseSession = Inject<
  orm.DatabaseSession<orm.DatabaseAdapter>,
  typeof DATABASE_SESSION
>;

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
    ],
    listeners: [DatabaseListener],
    exports: [DATABASE, DATABASE_SESSION],
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
