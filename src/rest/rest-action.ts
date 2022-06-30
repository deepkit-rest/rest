import {
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
