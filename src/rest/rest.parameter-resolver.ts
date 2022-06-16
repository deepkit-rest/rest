import {
  HttpNotFoundError,
  RouteParameterResolver,
  RouteParameterResolverContext,
} from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import {
  deserialize,
  InlineRuntimeType,
  ReflectionClass,
  validate,
  ValidationError,
} from "@deepkit/type";

import { restClass } from "./rest.decorator";
import { RestResource } from "./rest.interface";
import { RestQuery } from "./rest.query";

export class RestParameterResolver implements RouteParameterResolver {
  constructor(private injector: InjectorContext) {}

  // TODO: prettify implementation
  // eslint-disable-next-line complexity
  async resolve(context: RouteParameterResolverContext): Promise<unknown> {
    context.route = (context as any).routeConfig; // temporary workaround

    const { controller: classType, module } = context.route.action;

    const resourceMeta = restClass._fetch(classType)?.validate();
    if (!resourceMeta)
      throw new Error(`Cannot resolve parameters for non-resource controllers`);
    const resource = this.injector.get(classType, module) as RestResource<any>;

    const actionName = context.route.action.methodName;
    const actionMeta = resourceMeta.actions[actionName];
    if (!actionMeta)
      throw new Error(`Cannot resolve parameters for non-action methods`);
    if (!actionMeta.detailed)
      throw new Error("Cannot resolve parameters for non-detailed actions");

    const entitySchema = ReflectionClass.from(resourceMeta.entityType);

    const lookupField = resourceMeta.lookup;
    if (!lookupField)
      throw new Error("Lookup field must be specified for detailed actions");

    if (!entitySchema.hasProperty(lookupField))
      throw new Error("Lookup field does not exist");
    const lookupType = entitySchema.getProperty(lookupField).type;
    type LookupType = InlineRuntimeType<typeof lookupType>;

    let lookupValue = context.parameters[lookupField];
    lookupValue = deserialize<LookupType>(lookupValue);
    const lookupValueValidationErrors = validate<LookupType>(lookupValue);
    if (lookupValueValidationErrors.length)
      throw new ValidationError(lookupValueValidationErrors);

    if (context.name === "lookup") {
      return lookupValue;
    } else if (context.name === "target") {
      const lookupResult = await resource
        .query()
        .lift(RestQuery)
        .filterAppend({ [lookupField]: lookupValue })
        .findOneOrUndefined();
      if (!lookupResult) throw new HttpNotFoundError();
      return lookupResult;
    }

    throw new Error(`Unsupported parameter name ${context.name}`);
  }
}
