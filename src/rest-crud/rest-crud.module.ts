import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { RestCrudAdapter } from "./rest-crud-crud-adapter.interface";
import { RestCrudHandler } from "./rest-crud-crud-handler.service";

export class RestCrudModule<Entity> extends createModule({
  providers: [{ provide: RestCrudHandler, scope: "http" }],
  exports: [RestCrudHandler],
}) {
  adapter?: ClassType<RestCrudAdapter<Entity>>;

  withAdapter(adapter: this["adapter"]): this {
    this.adapter = adapter;
    return this;
  }

  override process(): void {
    if (!this.adapter) throw new Error("Adapter not specified");
    this.addProvider({
      provide: RestCrudAdapter,
      useClass: this.adapter,
      scope: "http",
    });
  }
}
