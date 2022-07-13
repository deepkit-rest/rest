import {
  httpClass,
  HttpRequest,
  RouteClassControllerAction,
  RouteParameterResolver,
  RouteParameterResolverContext,
} from "@deepkit/http";
import { InjectorModule } from "@deepkit/injector";
import { ReceiveType, ReflectionClass } from "@deepkit/type";
import { purify } from "src/common/type";
import {
  HttpControllerMeta,
  HttpInjectorContext,
  HttpRouteConfig,
  HttpRouteMeta,
} from "src/http-extension/http-common";
import { HttpRequestParser } from "src/http-extension/http-request-parser.service";

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
  private controllerMeta?: HttpControllerMeta;
  private routeMeta?: HttpRouteMeta;
  private requestBody?: Record<string, unknown>;
  private requestQueries?: Record<string, unknown>;
  private requestPathParams?: Record<string, unknown>;

  constructor(
    private request: HttpRequest,
    private routeConfig: HttpRouteConfig,
    private injector: HttpInjectorContext,
    private requestParser: HttpRequestParser,
  ) {}

  getRequest(): HttpRequest {
    return this.request;
  }

  async loadRequestBody(): Promise<void> {
    if (this.requestBody) return;
    this.requestBody = await this.requestParser.parseBody(this.request);
  }

  getRequestBody<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    if (!this.requestBody) throw new Error("Request body is not loaded");
    return type ? purify<T>(this.requestBody, type) : (this.requestBody as T);
  }

  getRequestQueries<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    if (!this.requestQueries) {
      const [, queries] = this.requestParser.parseUrl(this.request.getUrl());
      this.requestQueries = queries;
    }
    return type
      ? purify<T>(this.requestQueries, type)
      : (this.requestQueries as T);
  }

  getRequestPathParams<T extends object = Record<string, unknown>>(
    type?: ReceiveType<T>,
  ): T {
    if (!this.requestPathParams) {
      const [path] = this.requestParser.parseUrl(this.request.getUrl());
      const pathSchema = this.getRouteConfig().getFullPath();
      const parameters = this.requestParser.parsePath(pathSchema, path);
      this.requestPathParams = parameters;
    }
    return type
      ? purify<T>(this.requestPathParams, type)
      : (this.requestPathParams as T);
  }

  getRouteConfig(): HttpRouteConfig {
    return this.routeConfig;
  }

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
      const resourceType = this.getRouteConfigAction().controller;
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
      const actionName = this.getRouteConfigAction().methodName;
      this.actionMeta = resourceMeta.actions[actionName].validate();
    }
    if (!this.actionMeta)
      throw new Error(`Cannot resolve parameters for non-action routes`);
    return this.actionMeta;
  }

  getControllerMeta(): HttpControllerMeta {
    if (!this.controllerMeta) {
      const resourceType = this.getRouteConfigAction().controller;
      this.controllerMeta = httpClass._fetch(resourceType);
    }
    if (!this.controllerMeta) throw new Error("Cannot read controller meta");
    return this.controllerMeta;
  }

  getRouteMeta(): HttpRouteMeta {
    if (!this.routeMeta) {
      const controllerMeta = this.getControllerMeta();
      const actionName = this.getRouteConfigAction().methodName;
      this.routeMeta = controllerMeta.getAction(actionName);
    }
    if (!this.routeMeta) throw new Error("Cannot read route meta");
    return this.routeMeta;
  }

  private getRouteConfigAction(): RouteClassControllerAction {
    const actionInfo = this.routeConfig.action;
    if (actionInfo.type === "function")
      throw new Error("Functional routes are not yet supported");
    return actionInfo;
  }
}
