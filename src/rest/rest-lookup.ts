import { HttpNotFoundError } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import {
  deserialize,
  InlineRuntimeType,
  ReflectionClass,
  validate,
  ValidationError,
} from "@deepkit/type";

import { RestQuery } from "./rest.query";
import { RestActionContext } from "./rest-action";

export interface RestLookupResolver {
  resolveValue(context: RestActionContext): Promise<unknown>;
  resolveResult(context: RestActionContext): Promise<unknown>;
}

export class RestFieldLookupResolver implements RestLookupResolver {
  constructor(protected injector: InjectorContext) {}

  async resolveValue(context: RestActionContext): Promise<unknown> {
    const { parameters, resourceMeta } = context;
    const entitySchema = ReflectionClass.from(resourceMeta.entityType);

    const lookupField = this.resolveField(context);
    const lookupType = entitySchema.getProperty(lookupField).type;
    type LookupType = InlineRuntimeType<typeof lookupType>;

    let lookupValue = parameters[lookupField];
    lookupValue = deserialize<LookupType>(lookupValue);
    const validationErrors = validate<LookupType>(lookupValue);
    if (validationErrors.length) throw new ValidationError(validationErrors);

    return lookupValue;
  }

  async resolveResult(context: RestActionContext): Promise<unknown> {
    const { module, resourceMeta } = context;

    const resource = this.injector.get(resourceMeta.classType, module);
    const lookupField = this.resolveField(context);
    const lookupValue = await this.resolveValue(context);
    const lookupResult = await resource
      .query()
      .lift(RestQuery)
      .filterAppend({ [lookupField]: lookupValue })
      .findOneOrUndefined();

    if (!lookupResult) throw new HttpNotFoundError();
    return lookupResult;
  }

  protected resolveField(context: RestActionContext): string {
    const field = context.resourceMeta.lookup;
    if (!field) throw new Error("Lookup not configured");
    return field;
  }
}

export class RestPrimaryKeyLookupResolver extends RestFieldLookupResolver {
  protected override resolveField(context: RestActionContext): string {
    const entitySchema = ReflectionClass.from(context.resourceMeta.entityType);
    return entitySchema.getPrimary().name;
  }
}
