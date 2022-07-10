import { AppModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { http } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { join } from "path";

import { RestConfig } from "../rest.config";
import {
  RestActionContext,
  RestActionRouteParameterResolver,
} from "./rest-action";
import { restClass } from "./rest-decoration";
import { RestActionMetaValidated, RestResourceMeta } from "./rest-meta";

export interface RestResource<Entity> {
  query(): orm.Query<Entity>;
}

export class RestResourceRegistry extends Set<RestResourceRegistryItem> {}

export interface RestResourceRegistryItem {
  type: ClassType<RestResource<unknown>>;
  module: AppModule<any>;
}

export class RestResourceInstaller {
  constructor(private config: RestConfig) {}

  setup(type: ResourceClassType): void {
    const meta = this.getMetaOrThrow(type);
    const path =
      this.config.versioning && meta.version
        ? `${this.config.prefix}/${this.config.versioning}${meta.version}/${meta.name}`
        : `${this.config.prefix}/${meta.name}`;
    http.controller(path)(type);
    Object.keys(meta.actions).forEach((name) => this.setupAction(type, name));
  }

  setupAction(type: ResourceClassType, name: string): void {
    const resourceMeta = this.getMetaOrThrow(type).validate();
    const actionMeta = resourceMeta.actions[name].validate();
    let path = actionMeta.detailed ? `:${resourceMeta.lookup}` : "";
    if (actionMeta.path) path = join(path, actionMeta.path);
    http[actionMeta.method](path)(type.prototype, name);
    this.setupActionParameterResolver(actionMeta);
    actionMeta.configurators.forEach((configurator) => {
      configurator.configure(actionMeta);
    });
  }

  private setupActionParameterResolver(
    actionMeta: RestActionMetaValidated,
  ): void {
    const resourceMeta = actionMeta.resource.validate();
    const resolver = RestActionRouteParameterResolver;
    const args = [resourceMeta.classType.prototype, actionMeta.name] as const;
    http.resolveParameter(RestActionContext, resolver)(...args);
    if (actionMeta.detailed) {
      http.resolveParameterByName("lookup", resolver)(...args);
      http.resolveParameterByName("target", resolver)(...args);
    }
  }

  private getMetaOrThrow(type: ResourceClassType): RestResourceMeta {
    const meta = restClass._fetch(type)?.validate();
    if (!meta) throw new Error("Resource not decorated");
    return meta;
  }
}

type ResourceClassType = ClassType<RestResource<unknown>>;
