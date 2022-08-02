import { Data, ReflectionClass, ReflectionProperty } from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "@deepkit-rest/common";

import { RestEntityModelFactory } from "./rest-entity-model";

export type InUpdate = Data<"inUpdate", true>;

export class RestUpdateSchemaFactory extends RestEntityModelFactory {
  protected selectFields(
    entitySchema: ReflectionClass<any>,
  ): ReflectionProperty[] {
    return entitySchema.getProperties().filter((s) => s.getData()["inUpdate"]);
  }

  protected processField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): ReflectionClassAddPropertyOptions {
    return {
      name: fieldSchema.name,
      type: fieldSchema.type,
      optional: true,
    };
  }
}
