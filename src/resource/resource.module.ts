import { createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { ResourceAdapter } from "./resource.adapter";
import { ResourceService } from "./resource.service";

export class ResourceModule<Entity> extends createModule({
  providers: [{ provide: ResourceService, scope: "http" }],
  exports: [ResourceService],
}) {
  adapter?: ClassType<ResourceAdapter<Entity>>;

  withAdapter(adapter: this["adapter"]): this {
    this.adapter = adapter;
    return this;
  }

  override process(): void {
    if (this.adapter)
      this.addProvider({ provide: this.adapter, scope: "http" });
  }
}
