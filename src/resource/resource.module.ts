import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { ResourceCrudAdapter } from "./resource-crud-adapter.interface";
import { ResourceCrudHandler } from "./resource-crud-handler.service";

export class ResourceModule<Entity> extends createModule({
  providers: [{ provide: ResourceCrudHandler, scope: "http" }],
  exports: [ResourceCrudHandler],
}) {
  adapter?: ClassType<ResourceCrudAdapter<Entity>>;

  withAdapter(adapter: this["adapter"]): this {
    this.adapter = adapter;
    return this;
  }

  override process(): void {
    if (!this.adapter) throw new Error("Adapter not specified");
    this.addProvider({
      provide: ResourceCrudAdapter,
      useClass: this.adapter,
      scope: "http",
    });
  }
}
