import { ClassType } from "@deepkit/core";
import { ReflectionClass, ReflectionProperty } from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

// TODO: move to a better place

class RestQueryModel {}

export abstract class RestQueryModelFactory {
  protected products = new Map<ClassType<any>, ReflectionClass<any>>();

  build<Entity>(entityType: ClassType<Entity>): ReflectionClass<any> {
    if (!entityType) throw new Error("Type not specified");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (this.products.has(entityType)) return this.products.get(entityType)!;
    const entitySchema = ReflectionClass.from(entityType);
    const modelSchema = ReflectionClass.from(RestQueryModel).clone();
    const fieldSchemas = this.selectFields(entitySchema);
    fieldSchemas.forEach((fieldSchema) => {
      const transformed = this.processField(entitySchema, fieldSchema);
      modelSchema.addProperty(transformed);
    });
    this.products.set(entityType, modelSchema);
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
