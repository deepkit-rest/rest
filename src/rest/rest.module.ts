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
import { RestResource, RestResourceManager } from "./rest-resource";

export class RestModule extends createModule(
  {
    config: RestConfig,
    providers: [
      RestResourceManager,
      RestActionRouteParameterResolver,
      RestFieldLookupResolver,
      RestPrimaryKeyLookupResolver,
    ],
    exports: [
      RestResourceManager,
      RestActionRouteParameterResolver,
      RestFieldLookupResolver,
      RestPrimaryKeyLookupResolver,
    ],
    listeners: [RestListener],
  },
  "rest",
) {
  readonly registry = new RestResourceRegistry();

  override process(): void {
    this.addProvider({
      provide: RestResourceRegistry,
      useValue: this.registry,
    });
  }

  override processController(
    module: AppModule<any, any>,
    type: ClassType<any>,
  ): void {
    const isResource = !!restClass._fetch(type);
    if (!isResource) return;
    if (!module.isProvided(type)) module.addProvider(type);
    this.registry.add({ module, type });
  }
}

export class RestResourceRegistry extends Set<RestResourceRegistryItem> {}

export interface RestResourceRegistryItem {
  type: ClassType<RestResource<unknown>>;
  module: AppModule<any>;
}
