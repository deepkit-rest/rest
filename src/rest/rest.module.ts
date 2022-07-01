import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import { RestConfig } from "./rest.config";
import { restClass } from "./rest.decorator";
import { RestListener } from "./rest.listener";
import { RestActionRouteParameterResolver } from "./rest-action";
import {
  RestFieldLookupResolver,
  RestPrimaryKeyLookupResolver,
} from "./rest-lookup";
import { RestResourceInstaller, RestResourceRegistry } from "./rest-resource";

export class RestModule extends createModule(
  {
    config: RestConfig,
    providers: [
      { provide: RestActionRouteParameterResolver, scope: "http" },
      { provide: RestFieldLookupResolver, scope: "http" },
      { provide: RestPrimaryKeyLookupResolver, scope: "http" },
    ],
    exports: [
      RestActionRouteParameterResolver,
      RestFieldLookupResolver,
      RestPrimaryKeyLookupResolver,
    ],
    listeners: [RestListener],
  },
  "rest",
) {
  readonly registry = new RestResourceRegistry();
  readonly installer = new RestResourceInstaller(this.config);

  override process(): void {
    this.addProvider(
      { provide: RestResourceRegistry, useValue: this.registry },
      { provide: RestResourceInstaller, useValue: this.installer },
    );
  }

  override processController(
    module: AppModule<any, any>,
    type: ClassType<any>,
  ): void {
    const isResource = !!restClass._fetch(type);
    if (!isResource) return;
    if (!module.isProvided(type))
      module.addProvider({ provide: type, scope: "http" });
    this.registry.add({ module, type });
    this.installer.setup(type);
  }
}
