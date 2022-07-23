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
} from "src/http-extension/http-common";

import { restClass } from "./rest-decoration";
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
    protected cache: RestActionContextCache,
    protected injector: HttpInjectorContext,
    protected routeConfig: HttpRouteConfig,
  ) {}

  getModule(): InjectorModule {
    return this.getCacheOrCreate(this.getModule, () => {
      const module = this.routeConfig.action.module;
      if (!module) throw new Error("Cannot read resource module");
      return module;
    });
  }

  getResource(): RestResource<Entity> {
    return this.getCacheOrCreate(this.getResource, () =>
      this.injector.get(this.getResourceMeta().classType, this.getModule()),
    );
  }

  getResourceSchema(): ReflectionClass<any> {
    return this.getCacheOrCreate(this.getResourceSchema, () => {
      const resourceType = this.getResourceMeta().classType;
      return ReflectionClass.from(resourceType);
    });
  }

  getResourceMeta(): RestResourceMetaValidated<Entity> {
    return this.getCacheOrCreate(this.getResourceMeta, () => {
      const resourceType = this.getActionInfo().controller;
      const resourceMeta = restClass._fetch(resourceType)?.validate() as
        | RestResourceMetaValidated<Entity>
        | undefined;
      if (!resourceMeta) throw new Error(`Cannot read resource meta`);
      return resourceMeta;
    });
  }

  getEntitySchema(): ReflectionClass<any> {
    return this.getCacheOrCreate(this.getEntitySchema, () => {
      const entityType = this.getResourceMeta().entityType;
      return ReflectionClass.from(entityType);
    });
  }

  getActionMeta(): RestActionMetaValidated {
    return this.getCacheOrCreate(this.getActionMeta, () => {
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

  protected getCache<Method extends (...args: any[]) => any>(
    method: Method,
  ): ReturnType<Method> | null {
    const value = this.cache.get(method);
    return (value as ReturnType<Method>) ?? null;
  }

  protected getCacheOrCreate<Method extends (...args: any[]) => any>(
    method: Method,
    factory: () => ReturnType<Method>,
  ): ReturnType<Method> {
    const cached = this.getCache(method);
    if (cached) return cached;
    const value = factory();
    this.cache.set(method, value);
    return value;
  }

  protected async getCacheOrCreateAsync<Method extends (...args: any[]) => any>(
    method: Method,
    factory: () => Promise<ReturnType<Method>>,
  ): Promise<ReturnType<Method>> {
    const cached = this.getCache(method);
    if (cached) return cached;
    const value = await factory();
    this.cache.set(method, value);
    return value;
  }

  private getActionInfo(): RouteClassControllerAction {
    const actionInfo = this.routeConfig.action;
    if (actionInfo.type === "function")
      throw new Error("Functional routes are not yet supported");
    return actionInfo;
  }
}

export class RestActionContextCache extends Map<
  (...args: any[]) => any,
  unknown
> {}
