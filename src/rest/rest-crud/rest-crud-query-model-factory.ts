/* eslint-disable @typescript-eslint/no-unused-vars */
import { FieldName } from "@deepkit/orm";
import {
  ReceiveType,
  ReflectionClass,
  ReflectionProperty,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

class RestCrudQueryModel {}

export abstract class RestCrudQueryModelFactory {
  build<Entity>(entityType?: ReceiveType<Entity>): ReflectionClass<any> {
    if (!entityType) throw new Error("Type not specified");
    const entitySchema = ReflectionClass.from(entityType);
    const modelSchema = ReflectionClass.from(RestCrudQueryModel).clone();
    const fieldSchemas = this.selectFields(entitySchema);
    fieldSchemas.forEach((fieldSchema) => {
      const transformed = this.processField(entitySchema, fieldSchema);
      modelSchema.addProperty(transformed);
    });
    return modelSchema;
  }

  protected abstract selectFields(
    entitySchema: ReflectionClass<any>,
  ): ReflectionProperty[];

  protected abstract processField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): ReflectionClassAddPropertyOptions;
}
