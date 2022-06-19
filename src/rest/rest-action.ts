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
import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest.meta";
import { RestQuery } from "./rest.query";

export class RestActionRouteParameterResolver
  implements RouteParameterResolver
{
  constructor(private lookupResolver: RestActionLookupResolver) {}

  async resolve(contextRaw: RouteParameterResolverContext): Promise<unknown> {
    contextRaw.route = (contextRaw as any).routeConfig; // temporary workaround

    const context = RestActionContext.build(contextRaw);

    if (context.parameterToken === RestActionContext) return context;

    if (context.parameterName === "lookup")
      return this.lookupResolver.resolveValue(context);
    if (context.parameterName === "target")
      return this.lookupResolver.resolveResult(context);

    throw new Error(`Unsupported parameter name ${contextRaw.name}`);
  }
}

export class RestActionLookupResolver {
  constructor(private injector: InjectorContext) {}

  async resolveValue(context: RestActionContext): Promise<unknown> {
    const { parameters, resourceMeta, actionMeta } = context;
    const entitySchema = ReflectionClass.from(resourceMeta.entityType);

    if (!actionMeta.detailed)
      throw new Error("Cannot resolve lookup value for non-detailed actions");

    const lookupField = this.getField(resourceMeta, entitySchema);
    const lookupType = entitySchema.getProperty(lookupField).type;
    type LookupType = InlineRuntimeType<typeof lookupType>;

    let lookupValue = parameters[lookupField];
    lookupValue = deserialize<LookupType>(lookupValue);
    const validationErrors = validate<LookupType>(lookupValue);
    if (validationErrors.length) throw new ValidationError(validationErrors);

    return lookupValue;
  }

  async resolveResult(context: RestActionContext): Promise<unknown> {
    const { module, resourceMeta, actionMeta } = context;
    const entitySchema = ReflectionClass.from(resourceMeta.entityType);

    if (!actionMeta.detailed)
      throw new Error("Cannot resolve lookup result for non-detailed actions");

    const resource = this.injector.get(resourceMeta.classType, module);
    const lookupField = this.getField(resourceMeta, entitySchema);
    const lookupValue = await this.resolveValue(context);
    const lookupResult = await resource
      .query()
      .lift(RestQuery)
      .filterAppend({ [lookupField]: lookupValue })
      .findOneOrUndefined();

    if (!lookupResult) throw new HttpNotFoundError();
    return lookupResult;
  }

  private getField(
    resourceMeta: RestResourceMetaValidated,
    entitySchema: ReflectionClass<any>,
  ) {
    const lookupField = resourceMeta.lookup;
    if (!lookupField) throw new Error("Lookup field not specified");
    if (!entitySchema.hasProperty(lookupField))
      throw new Error("Lookup field does not exist");
    return lookupField;
  }
}

export class RestActionContext {
  static build(context: RouteParameterResolverContext): RestActionContext {
    const { controller: resourceType, module } = context.route.action;

    const resourceMeta = restClass._fetch(resourceType)?.validate();
    if (!resourceMeta)
      throw new Error(`Cannot resolve parameters for non-resource controllers`);

    const actionName = context.route.action.methodName;
    const actionMeta = resourceMeta.actions[actionName].validate();
    if (!actionMeta)
      throw new Error(`Cannot resolve parameters for non-action routes`);

    return new RestActionContext({
      request: context.request,
      parameterName: context.name,
      parameterToken: context.token,
      parameters: context.parameters,
      module,
      resourceMeta,
      actionMeta,
    });
  }

  request!: HttpRequest;
  parameterName!: string;
  parameterToken!: unknown;
  parameters!: Record<string, unknown>;
  module?: InjectorModule;
  resourceMeta!: RestResourceMetaValidated;
  actionMeta!: RestActionMetaValidated;

  private constructor(data: RestActionContext) {
    Object.assign(this, data);
  }
}
