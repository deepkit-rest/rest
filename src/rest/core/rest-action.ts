import {
  httpClass,
  HttpRequest,
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
  request: HttpRequest;
  module: InjectorModule;
  resourceMeta: RestResourceMetaValidated<Entity>;
  actionMeta: RestActionMetaValidated;
  controllerMeta: HttpControllerMeta;
  routeMeta: HttpRouteMeta;

  constructor(request: HttpRequest, route: HttpRouteConfig) {
    if (route.action.type === "function")
      throw new Error("Functional routes are not yet supported");

    const module = route.action.module;
    if (!module) throw new Error("Cannot read resource module");

    const resourceType = route.action.controller;
    const resourceMeta = restClass._fetch(resourceType)?.validate() as
      | RestResourceMetaValidated<Entity>
      | undefined;
    if (!resourceMeta)
      throw new Error(`Cannot resolve parameters for non-resource controllers`);

    const actionName = route.action.methodName;
    const actionMeta = resourceMeta.actions[actionName].validate();
    if (!actionMeta)
      throw new Error(`Cannot resolve parameters for non-action routes`);

    const controllerMeta = httpClass._fetch(resourceType);
    if (!controllerMeta) throw new Error("Cannot read controller meta");
    const routeMeta = controllerMeta.getAction(actionName);

    this.request = request;
    this.module = module;
    this.resourceMeta = resourceMeta;
    this.actionMeta = actionMeta;
    this.controllerMeta = controllerMeta;
    this.routeMeta = routeMeta;
  }
}

export class RestActionContextReader {
  constructor(
    private injector: HttpInjectorContext,
    private requestParser: HttpRequestParser,
  ) {}

  getResource<Entity>(
    context: RestActionContext<Entity>,
  ): RestResource<Entity> {
    return this.injector.get(context.resourceMeta.classType, context.module);
  }

  getResourceSchema(context: RestActionContext): ReflectionClass<any> {
    return ReflectionClass.from(context.resourceMeta.classType);
  }

  getEntitySchema(context: RestActionContext): ReflectionClass<any> {
    return ReflectionClass.from(context.resourceMeta.entityType);
  }

  async parseBody<T extends object = Record<string, unknown>>(
    context: RestActionContext,
    type?: ReceiveType<T>,
  ): Promise<T> {
    const { request } = context;
    request.body ??= await this.requestParser.parseBody(request);
    return type ? purify<T>(request.body, type) : (request.body as T);
  }

  parseQueries<T extends object = Record<string, unknown>>(
    context: RestActionContext,
    type?: ReceiveType<T>,
  ): T {
    const { request } = context;
    const [, queries] = this.requestParser.parseUrl(request.getUrl());
    return type ? purify<T>(queries, type) : (queries as T);
  }

  getLookupInfo<Entity>(
    context: RestActionContext<Entity>,
  ): [name: string, value: unknown] {
    const lookup = context.resourceMeta.lookup;
    const [path] = this.requestParser.parseUrl(context.request.getUrl());
    const pathSchema = context.routeMeta.path;
    const parameters = this.requestParser.parsePath(pathSchema, path);
    const value = parameters[lookup];
    return [lookup, value];
  }
}
