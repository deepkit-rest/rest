import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { DatabaseEntitySet } from "./database.providers";
import { AppDatabase, SQLiteDatabase } from "./database.service";

export class DatabaseModuleConfig {
  url?: string;
}

export class DatabaseModule extends createModule({
  providers: [{ provide: AppDatabase, useClass: SQLiteDatabase }],
  exports: [AppDatabase],
  config: DatabaseModuleConfig,
}) {
  protected entities = new DatabaseEntitySet();

  withEntities(...entities: ClassType[]): this {
    entities.forEach((entity) => this.entities.add(entity));
    return this;
  }

  override process(): void {
    this.addProvider({ provide: DatabaseEntitySet, useValue: this.entities });
  }
}
