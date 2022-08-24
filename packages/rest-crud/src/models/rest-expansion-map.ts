import {
  Data,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "@deepkit-rest/common";

import { RestEntityModelFactory } from "./rest-entity-model";

export type Expandable = Data<"expandable", true>;

export class RestExpansionMapFactory extends RestEntityModelFactory {
  protected selectFields(
    entitySchema: ReflectionClass<any>,
  ): ReflectionProperty[] {
    return entitySchema
      .getProperties()
      .filter((p) => p.getData()["expandable"]);
  }

  protected processField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): ReflectionClassAddPropertyOptions {
    if (!fieldSchema.isReference() && !fieldSchema.isBackReference())
      throw new Error("Only relational fields cannot be expanded");
    return {
      name: fieldSchema.name,
      type: { kind: ReflectionKind.boolean },
      optional: true,
    };
  }
}
