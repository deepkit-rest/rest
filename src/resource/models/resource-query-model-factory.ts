/* eslint-disable @typescript-eslint/no-unused-vars */
import { FieldName } from "@deepkit/orm";
import {
  ReceiveType,
  ReflectionClass,
  ReflectionProperty,
} from "@deepkit/type";

class ResourceQueryModel {}

export abstract class ResourceQueryModelFactory {
  protected constructor() {}

  static build<Entity>(
    fields: FieldName<Entity>[] | "all",
    strategy: "include" | "exclude" = "include",
    entityType?: ReceiveType<Entity>,
  ): ReflectionClass<any> {
    const entitySchema = ReflectionClass.from(entityType);
    const modelSchema = ReflectionClass.from(ResourceQueryModel).clone();
    fields = this.selectFields(entitySchema, fields, strategy);
    fields.forEach((field) => {
      const fieldSchema = entitySchema.getProperty(field);
      const transformed = this.transformField(entitySchema, fieldSchema);
      modelSchema.addProperty(transformed);
    });
    return modelSchema;
  }

  protected static selectFields<Entity>(
    entitySchema: ReflectionClass<any>,
    fields: FieldName<Entity>[] | "all",
    strategy: "include" | "exclude",
  ): FieldName<Entity>[] {
    if (fields === "all") {
      fields =
        strategy === "include" ? this.selectValidFields(entitySchema) : [];
    } else if (strategy === "exclude") {
      const all = this.selectValidFields(entitySchema);
      fields = all.filter((field) => !fields.includes(field));
    }
    return fields;
  }

  protected static selectValidFields<Entity>(
    entitySchema: ReflectionClass<any>,
  ): FieldName<Entity>[] {
    throw new Error("Not implemented");
  }

  protected static transformField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): AddPropertyOptions {
    throw new Error("Not implemented");
  }
}

export type AddPropertyOptions = Parameters<
  ReflectionClass<any>["addProperty"]
>[0];
