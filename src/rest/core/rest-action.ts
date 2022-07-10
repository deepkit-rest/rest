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
  HttpRouteMeta,
} from "src/http-extension/http-common";
import { HttpRequestParser } from "src/http-extension/http-request-parser.service";

import { restClass } from "./rest-decoration";
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest-meta";
import { RestResource } from "./rest-resource";

export class RestActionRouteParameterResolver
  implements RouteParameterResolver
{
  resolve(context: RouteParameterResolverContext): unknown {
    context.route = (context as any).routeConfig; // temporary workaround
    const actionContext = RestActionContext.build(context);
    if (context.token === RestActionContext) return actionContext;
    throw new Error(`Unsupported parameter name ${context.name}`);
  }
}

export class RestActionContext<Entity = any> {
  static build(context: RouteParameterResolverContext): RestActionContext {
    const { controller: resourceType, module } = context.route.action;
    if (!module) throw new Error("Cannot read resource module");

    const resourceMeta = restClass._fetch(resourceType)?.validate();
    if (!resourceMeta)
      throw new Error(`Cannot resolve parameters for non-resource controllers`);
    const actionName = context.route.action.methodName;
    const actionMeta = resourceMeta.actions[actionName].validate();
    if (!actionMeta)
      throw new Error(`Cannot resolve parameters for non-action routes`);

    const controllerMeta = httpClass._fetch(resourceType);
    if (!controllerMeta) throw new Error("Cannot read controller meta");
    const routeMeta = controllerMeta.getAction(actionName);

    return new RestActionContext({
      request: context.request,
      module,
      resourceMeta,
      actionMeta,
      actionParameters: context.parameters,
      controllerMeta,
      routeMeta,
    });
  }

  request!: HttpRequest;
  module!: InjectorModule;
  resourceMeta!: RestResourceMetaValidated<Entity>;
  actionMeta!: RestActionMetaValidated;
  actionParameters!: Record<string, unknown>;
  controllerMeta!: HttpControllerMeta;
  routeMeta!: HttpRouteMeta;

  private constructor(data: RestActionContext<Entity>) {
    Object.assign(this, data);
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
    return type ? purify<T>(request.body, type) : (request.body as T); // TODO: is it a bug to require passing `type` here?
  }

  parseQueries<T extends object = Record<string, unknown>>(
    context: RestActionContext,
    type?: ReceiveType<T>,
  ): T {
    const { request } = context;
    const { queries } = this.requestParser.parseUrl(request.getUrl());
    return type ? purify<T>(queries, type) : (queries as T); // TODO: is it a bug to require passing `type` here?
  }

  getLookupInfo<Entity>(
    context: RestActionContext<Entity>,
  ): [name: string, value: unknown] {
    const lookup = context.resourceMeta.lookup;
    if (!lookup) throw new Error("Lookup not specified");
    const value = context.actionParameters[lookup];
    return [lookup, value];
  }
}
