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

export class RestParameterResolver implements RouteParameterResolver {
  constructor(private injector: InjectorContext) {}

  async resolve(contextRaw: RouteParameterResolverContext): Promise<unknown> {
    contextRaw.route = (contextRaw as any).routeConfig; // temporary workaround

    const context = RestActionContext.build(contextRaw);

    if (context.parameterToken === RestActionContext) return context;
    if (context.parameterName === "lookup")
      return this.resolveLookup(context, false);
    if (context.parameterName === "target")
      return this.resolveLookup(context, true);

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
    }: RestActionContext,
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
}

// TODO: move to a more proper file
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

    const entitySchema = ReflectionClass.from(resourceMeta.entityType);

    return new RestActionContext({
      request: context.request,
      parameterName: context.name,
      parameterToken: context.token,
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
  parameterToken!: unknown;
  parameters!: Record<string, unknown>;
  module?: InjectorModule;
  entitySchema!: ReflectionClass<any>;
  resourceType!: ClassType<RestResource<any>>;
  resourceMeta!: RestResourceMetaValidated;
  actionName!: string;
  actionMeta!: RestActionMetaValidated;

  private constructor(data: RestActionContext) {
    Object.assign(this, data);
  }
}
