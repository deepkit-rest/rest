import { Data, ReflectionClass, ReflectionProperty } from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "@deepkit-rest/common";

import { RestEntityModelFactory } from "./rest-entity-model";

export type InCreation = Data<"inCreation", true>;

export class RestCreationSchemaFactory extends RestEntityModelFactory {
  protected selectFields(
    entitySchema: ReflectionClass<any>,
  ): ReflectionProperty[] {
    return entitySchema
      .getProperties()
      .filter((s) => s.getData()["inCreation"]);
  }

  protected processField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): ReflectionClassAddPropertyOptions {
    return {
      name: fieldSchema.name,
      type: fieldSchema.type,
      optional: fieldSchema.isOptional() || undefined,
    };
  }
}
