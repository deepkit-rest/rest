import { ClassType } from "@deepkit/core";
import {
  RouteClassControllerAction,
  RouteParameterResolver,
  RouteParameterResolverContext,
} from "@deepkit/http";
import { InjectorModule } from "@deepkit/injector";
import { ReflectionClass } from "@deepkit/type";
import {
  HttpInjectorContext,
  HttpRouteConfig,
  HttpScopedCache,
} from "@deepkit-rest/http-extension";

import { restResource } from "./rest-decoration";
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest-meta";
import { RestResource } from "./rest-resource";

export class RestActionParameterResolver implements RouteParameterResolver {
  constructor(private context: RestActionContext) {}

  resolve(context: RouteParameterResolverContext): unknown {
    if (context.token === RestActionContext) return this.context;
    throw new Error(`Unsupported parameter name ${context.name}`);
  }
}

export class RestActionContext<Entity = any> {
  constructor(
    protected cache: HttpScopedCache,
    protected injector: HttpInjectorContext,
    protected routeConfig: HttpRouteConfig,
  ) {}

  getModule(): InjectorModule {
    return this.cache.getOrCreate(this.getModule, () => {
      const module = this.routeConfig.action.module;
      if (!module) throw new Error("Cannot read resource module");
      return module;
    });
  }

  getResource(): RestResource<Entity> {
    return this.cache.getOrCreate(this.getResource, () =>
      this.injector.get(this.getResourceMeta().classType, this.getModule()),
    );
  }

  getResourceSchema(): ReflectionClass<any> {
    return this.cache.getOrCreate(this.getResourceSchema, () => {
      const resourceType = this.getResourceMeta().classType;
      return ReflectionClass.from(resourceType);
    });
  }

  getResourceMeta(): RestResourceMetaValidated<Entity> {
    return this.cache.getOrCreate(this.getResourceMeta, () => {
      const resourceType = this.getActionInfo().controller;
      const resourceMeta = restResource._fetch(resourceType)?.validate() as
        | RestResourceMetaValidated<Entity>
        | undefined;
      if (!resourceMeta) throw new Error(`Cannot read resource meta`);
      return resourceMeta;
    });
  }

  getEntitySchema(): ReflectionClass<any> {
    return this.cache.getOrCreate(this.getEntitySchema, () => {
      const entityType = this.getResourceMeta().entityType;
      return ReflectionClass.from(entityType);
    });
  }

  getActionMeta(): RestActionMetaValidated {
    return this.cache.getOrCreate(this.getActionMeta, () => {
      const resourceMeta = this.getResourceMeta();
      const actionName = this.getActionInfo().methodName;
      const actionMeta = resourceMeta.actions[actionName].validate();
      if (!actionMeta)
        throw new Error(`Cannot resolve parameters for non-action routes`);
      return actionMeta;
    });
  }

  resolveDep<Dep>(type: ClassType<Dep>): Dep {
    const module = this.getModule();
    return this.injector.resolve(module, type)();
  }

  private getActionInfo(): RouteClassControllerAction {
    const actionInfo = this.routeConfig.action;
    if (actionInfo.type === "function")
      throw new Error("Functional routes are not yet supported");
    return actionInfo;
  }
}
