import { ClassType } from "@deepkit/core";
import {
  http,
  HttpRequest,
  RouteParameterResolver,
  RouteParameterResolverContext,
} from "@deepkit/http";
import { InjectorContext, InjectorModule } from "@deepkit/injector";

import { restClass } from "./rest.decorator";
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest.meta";
import { RestFieldLookupResolver } from "./rest-lookup";
export class RestActionRouteParameterResolver
  implements RouteParameterResolver
{
  constructor(private injector: InjectorContext) {}

  setupAction(actionMeta: RestActionMetaValidated): void {
    const resourceMeta = actionMeta.resource.validate();
    const resolver = this.constructor as ClassType;
    const args = [resourceMeta.classType.prototype, actionMeta.name] as const;
    http.resolveParameter(RestActionContext, resolver)(...args);
    if (actionMeta.detailed) {
      http.resolveParameterByName("lookup", resolver)(...args);
      http.resolveParameterByName("target", resolver)(...args);
    }
  }

  async resolve(context: RouteParameterResolverContext): Promise<unknown> {
    context.route = (context as any).routeConfig; // temporary workaround

    const actionContext = await RestActionContext.build(context);

    if (context.token === RestActionContext) return actionContext;

    if (actionContext.actionMeta.detailed) {
      const {
        resourceMeta: { lookupResolverType = RestFieldLookupResolver },
        module,
      } = actionContext;

      const lookupResolver = this.injector.get(lookupResolverType, module);
      if (context.name === "lookup")
        return lookupResolver.resolveValue(actionContext);
      if (context.name === "target")
        return lookupResolver.resolveResult(actionContext);
    }

    throw new Error(`Unsupported parameter name ${context.name}`);
  }
}

export class RestActionContext {
  static async build(
    context: RouteParameterResolverContext,
  ): Promise<RestActionContext> {
    const { controller: resourceType, module } = context.route.action;
    if (!module) throw new Error("Module not defined");

    const resourceMeta = restClass._fetch(resourceType)?.validate();
    if (!resourceMeta)
      throw new Error(`Cannot resolve parameters for non-resource controllers`);

    const actionName = context.route.action.methodName;
    const actionMeta = resourceMeta.actions[actionName].validate();
    if (!actionMeta)
      throw new Error(`Cannot resolve parameters for non-action routes`);

    return new RestActionContext({
      request: context.request,
      parameters: context.parameters,
      module,
      resourceMeta,
      actionMeta,
    });
  }

  request!: HttpRequest;
  parameters!: Record<string, unknown>;
  module!: InjectorModule;
  resourceMeta!: RestResourceMetaValidated;
  actionMeta!: RestActionMetaValidated;

  private constructor(data: RestActionContext) {
    Object.assign(this, data);
  }
}
