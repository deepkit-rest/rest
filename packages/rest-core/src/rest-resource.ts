import { AppModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";
import { http, httpClass, HttpRouter } from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import { Database, Query } from "@deepkit/orm";
import { join } from "path/posix";

import { RestActionContext, RestActionParameterResolver } from "./rest-action";
import { RestCoreModuleConfig } from "./rest-core.module-config";
import { restResource } from "./rest-decoration";
import {
  RestActionMetaValidated,
  RestResourceMeta,
  RestResourceMetaValidated,
} from "./rest-meta";

export interface RestResource<Entity> {
  getDatabase(): Database;
  getQuery(): Query<Entity>;
}

export class RestGenericResource<Entity> implements RestResource<Entity> {
  protected database!: Inject<Database>;
  protected actionContext!: Inject<RestActionContext>;

  getDatabase(): Database {
    return this.database;
  }

  getQuery(): Query<Entity> {
    const entitySchema = this.actionContext.getEntitySchema();
    const entityClassType = entitySchema.getClassType();
    return this.database.query(entityClassType);
  }
}

export class RestResourceRegistry extends Set<RestResourceRegistryItem> {}

export interface RestResourceRegistryItem {
  type: ClassType<RestResource<unknown>>;
  module: AppModule<any>;
}

export class RestResourceMetaSetup {
  constructor(private config: RestCoreModuleConfig) {}

  setup(type: ResourceClassType): void {
    http.controller(this.config.baseUrl)(type);
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
    const meta = restResource._fetch(type)?.validate();
    if (!meta) throw new Error("Resource not decorated");
    return meta;
  }

  private buildResourcePath(resourceMeta: RestResourceMetaValidated): string {
    let path = "";
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

export class RestResourceRouter {
  constructor(private router: HttpRouter) {}

  register(type: ResourceClassType, module: AppModule<any>): void {
    // resources decorated with `@http` will be automatically added to the http
    // controller registry of `HttpModule`
    if (this.isRegistered(type, module)) return;
    this.router.addRouteForController(type, module);
  }

  isRegistered(type: ResourceClassType, module: AppModule<any>): boolean {
    return this.router
      .getRoutes()
      .some(
        ({ action }) =>
          action.module === module &&
          action.type === "controller" &&
          action.controller === type,
      );
  }
}

type ResourceClassType = ClassType<RestResource<unknown>>;
