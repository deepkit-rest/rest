import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { AppDatabase, SQLiteDatabase } from "./database.service";

export class DatabaseConfig {
  url: string = ":memory:";
}

export class DatabaseModule extends createModule(
  {
    providers: [{ provide: AppDatabase, useClass: SQLiteDatabase }],
    exports: [AppDatabase],
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
