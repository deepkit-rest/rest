import {
  ReceiveType,
  ReflectionClass,
  ReflectionProperty,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

class RestQueryModel {}

export abstract class RestQueryModelFactory {
  build<Entity>(entityType?: ReceiveType<Entity>): ReflectionClass<any> {
    if (!entityType) throw new Error("Type not specified");
    const entitySchema = ReflectionClass.from(entityType);
    const modelSchema = ReflectionClass.from(RestQueryModel).clone();
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
