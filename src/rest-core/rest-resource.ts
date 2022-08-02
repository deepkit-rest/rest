import { AppModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { http, httpClass } from "@deepkit/http";
import { Database, Query } from "@deepkit/orm";
import { join } from "path";

import { RestActionContext, RestActionParameterResolver } from "./rest-action";
import { RestCoreModuleConfig } from "./rest-core-config";
import { restClass } from "./rest-decoration";
import {
  RestActionMetaValidated,
  RestResourceMeta,
  RestResourceMetaValidated,
} from "./rest-meta";

export interface RestResource<Entity> {
  getDatabase(): Database;
  getQuery(): Query<Entity>;
}

export class RestResourceRegistry extends Set<RestResourceRegistryItem> {}

export interface RestResourceRegistryItem {
  type: ClassType<RestResource<unknown>>;
  module: AppModule<any>;
}

export class RestResourceInstaller {
  constructor(private config: RestCoreModuleConfig) {}

  setup(type: ResourceClassType): void {
    http.controller()(type);
    const resourceMeta = this.getMetaOrThrow(type).validate();
    const resourcePath = this.buildResourcePath(resourceMeta);
    Object.keys(resourceMeta.actions).forEach((name) => {
      const actionMeta = resourceMeta.actions[name].validate();
      this.setupActionPath(resourceMeta, actionMeta, resourcePath);
      this.setupActionParameterResolver(resourceMeta, actionMeta);
    });
    const controllerMeta = httpClass._fetch(type);
    if (!controllerMeta) throw new Error("Cannot read controller meta");
    controllerMeta.getActions().forEach((routeMeta) => {
      const isRestAction = routeMeta.methodName in resourceMeta.actions;
      if (isRestAction) return;
      routeMeta.path = join(resourcePath, routeMeta.path);
    });
  }

  private setupActionPath(
    resourceMeta: RestResourceMetaValidated,
    actionMeta: RestActionMetaValidated,
    resourcePath: string,
  ): void {
    const path = this.buildActionPath(resourcePath, actionMeta);
    http[actionMeta.method](path)(
      resourceMeta.classType.prototype,
      actionMeta.name,
    );
  }

  private setupActionParameterResolver(
    resourceMeta: RestResourceMetaValidated,
    actionMeta: RestActionMetaValidated,
  ): void {
    const resolver = RestActionParameterResolver;
    const args = [resourceMeta.classType.prototype, actionMeta.name] as const;
    http.resolveParameter(RestActionContext, resolver)(...args);
  }

  private getMetaOrThrow(type: ResourceClassType): RestResourceMeta {
    const meta = restClass._fetch(type)?.validate();
    if (!meta) throw new Error("Resource not decorated");
    return meta;
  }

  private buildResourcePath(resourceMeta: RestResourceMetaValidated): string {
    let path = "";
    if (this.config.prefix) path = join(path, this.config.prefix);
    path = join(path, resourceMeta.path);
    return path;
  }

  private buildActionPath(
    resourcePath: string,
    actionMeta: RestActionMetaValidated,
  ): string {
    let path = resourcePath;
    if (actionMeta.path) path = join(path, actionMeta.path);
    return path;
  }
}

type ResourceClassType = ClassType<RestResource<unknown>>;
