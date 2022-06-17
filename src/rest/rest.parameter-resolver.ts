import { ClassType } from "@deepkit/core";
import {
  HttpNotFoundError,
  HttpRequest,
  RouteParameterResolver,
  RouteParameterResolverContext,
} from "@deepkit/http";
import { InjectorContext, InjectorModule } from "@deepkit/injector";
import {
  deserialize,
  InlineRuntimeType,
  ReflectionClass,
  validate,
  ValidationError,
} from "@deepkit/type";

import { restClass } from "./rest.decorator";
import { RestResource } from "./rest.interfaces";
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest.meta";
import { RestQuery } from "./rest.query";
import { RestActionHandlerResolver } from "./rest-action-handler-resolver.service";

export class RestParameterResolver implements RouteParameterResolver {
  constructor(
    private injector: InjectorContext,
    private actionHandlerResolver: RestActionHandlerResolver,
  ) {}

  async resolve(contextRaw: RouteParameterResolverContext): Promise<unknown> {
    contextRaw.route = (contextRaw as any).routeConfig; // temporary workaround

    const context = RestParameterResolverContext.from(contextRaw);

    if (context.parameterName === "lookup")
      return this.resolveLookup(context, false);
    if (context.parameterName === "target")
      return this.resolveLookup(context, true);
    if (context.parameterName === "handler")
      return this.resolveActionHandler(context);

    throw new Error(`Unsupported parameter name ${contextRaw.name}`);
  }

  private async resolveLookup(
    {
      parameters,
      module,
      entitySchema,
      resourceType,
      resourceMeta,
      actionMeta,
    }: RestParameterResolverContext,
    query: boolean,
  ) {
    if (!actionMeta.detailed)
      throw new Error("Cannot lookup entity for non-detailed actions");

    const lookupField = resourceMeta.lookup;
    if (!lookupField) throw new Error("Lookup field not specified");

    if (!entitySchema.hasProperty(lookupField))
      throw new Error("Lookup field does not exist");
    const lookupType = entitySchema.getProperty(lookupField).type;
    type LookupType = InlineRuntimeType<typeof lookupType>;

    let lookupValue = parameters[lookupField];
    lookupValue = deserialize<LookupType>(lookupValue);
    const validationErrors = validate<LookupType>(lookupValue);
    if (validationErrors.length) throw new ValidationError(validationErrors);

    if (query) {
      const resource = this.injector.get(resourceType, module);
      const lookupResult = await resource
        .query()
        .lift(RestQuery)
        .filterAppend({ [lookupField]: lookupValue })
        .findOneOrUndefined();
      if (!lookupResult) throw new HttpNotFoundError();
      return lookupResult;
    }

    return lookupValue;
  }

  private async resolveActionHandler({
    request,
    module,
    actionMeta,
  }: RestParameterResolverContext) {
    const handlerType = actionMeta.handlerType;
    if (!handlerType) throw new Error("Action handler not specified");
    const handler = this.injector.get(handlerType, module);
    return this.actionHandlerResolver.resolve(handler, request);
  }
}

class RestParameterResolverContext {
  static from(context: RouteParameterResolverContext) {
    const { controller: resourceType, module } = context.route.action;

    const resourceMeta = restClass._fetch(resourceType)?.validate();
    if (!resourceMeta)
      throw new Error(`Cannot resolve parameters for non-resource controllers`);

    const actionName = context.route.action.methodName;
    const actionMeta = resourceMeta.actions[actionName].validate();
    if (!actionMeta)
      throw new Error(`Cannot resolve parameters for non-action routes`);

    const entitySchema = ReflectionClass.from(resourceMeta.entityType);

    return new RestParameterResolverContext({
      request: context.request,
      parameterName: context.name,
      parameters: context.parameters,
      module,
      entitySchema,
      resourceType,
      resourceMeta,
      actionName,
      actionMeta,
    });
  }

  request!: HttpRequest;
  parameterName!: string;
  parameters!: Record<string, unknown>;
  module?: InjectorModule;
  entitySchema!: ReflectionClass<any>;
  resourceType!: ClassType<RestResource<any>>;
  resourceMeta!: RestResourceMetaValidated;
  actionName!: string;
  actionMeta!: RestActionMetaValidated;

  constructor(data: RestParameterResolverContext) {
    Object.assign(this, data);
  }
}
