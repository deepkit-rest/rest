import {
  httpClass,
  HttpRequest,
  RouteParameterResolver,
  RouteParameterResolverContext,
} from "@deepkit/http";
import { InjectorModule } from "@deepkit/injector";
import {
  HttpControllerMeta,
  HttpRouteMeta,
} from "src/http-extension/http-common";

import { restClass } from "./rest.decorator";
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest.meta";

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

export class RestActionContext<Entity = unknown> {
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
