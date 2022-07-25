import { ClassType } from "@deepkit/core";
import { ReflectionClass, ReflectionProperty } from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

export abstract class RestEntityModelFactory {
  protected products = new Map<ClassType<any>, ReflectionClass<any>>();

  build<Entity>(entityType: ClassType<Entity>): ReflectionClass<any> {
    if (!entityType) throw new Error("Type not specified");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (this.products.has(entityType)) return this.products.get(entityType)!;
    const entitySchema = ReflectionClass.from(entityType);
    const modelSchema = this.createInitialSchema();
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

  protected createInitialSchema(): ReflectionClass<any> {
    class RestEntityModel {}
    return ReflectionClass.from(RestEntityModel);
  }
}
