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
  private module?: InjectorModule;
  private resource?: RestResource<Entity>;
  private resourceMeta?: RestResourceMetaValidated<Entity>;
  private resourceSchema?: ReflectionClass<any>;
  private entitySchema?: ReflectionClass<any>;
  private actionMeta?: RestActionMetaValidated;

  constructor(
    private injector: HttpInjectorContext,
    private routeConfig: HttpRouteConfig,
  ) {}

  getModule(): InjectorModule {
    if (!this.module) this.module = this.routeConfig.action.module;
    if (!this.module) throw new Error("Cannot read resource module");
    return this.module;
  }

  getResource(): RestResource<Entity> {
    if (!this.resource)
      this.resource = this.injector.get(
        this.getResourceMeta().classType,
        this.getModule(),
      );
    return this.resource;
  }

  getResourceSchema(): ReflectionClass<any> {
    if (!this.resourceSchema) {
      const resourceType = this.getResourceMeta().classType;
      this.resourceSchema = ReflectionClass.from(resourceType);
    }
    return this.resourceSchema;
  }

  getResourceMeta(): RestResourceMetaValidated<Entity> {
    if (!this.resourceMeta) {
      const resourceType = this.getActionInfo().controller;
      this.resourceMeta = restClass._fetch(resourceType)?.validate() as
        | RestResourceMetaValidated<Entity>
        | undefined;
    }
    if (!this.resourceMeta)
      throw new Error(`Cannot resolve parameters for non-resource controllers`);
    return this.resourceMeta;
  }

  getEntitySchema(): ReflectionClass<any> {
    if (!this.entitySchema) {
      const entityType = this.getResourceMeta().entityType;
      this.entitySchema = ReflectionClass.from(entityType);
    }
    return this.entitySchema;
  }

  getActionMeta(): RestActionMetaValidated {
    if (!this.actionMeta) {
      const resourceMeta = this.getResourceMeta();
      const actionName = this.getActionInfo().methodName;
      this.actionMeta = resourceMeta.actions[actionName].validate();
    }
    if (!this.actionMeta)
      throw new Error(`Cannot resolve parameters for non-action routes`);
    return this.actionMeta;
  }

  private getActionInfo(): RouteClassControllerAction {
    const actionInfo = this.routeConfig.action;
    if (actionInfo.type === "function")
      throw new Error("Functional routes are not yet supported");
    return actionInfo;
  }
}
