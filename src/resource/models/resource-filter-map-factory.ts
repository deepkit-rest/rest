import { FieldName } from "@deepkit/orm";
import {
  ReceiveType,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
  TypeObjectLiteral,
  TypePropertySignature,
} from "@deepkit/type";

import {
  AddPropertyOptions,
  ResourceQueryModelFactory,
} from "./resource-query-model-factory";

export class ResourceFilterMapFactory extends ResourceQueryModelFactory {
  static override build<Entity>(
    fields: FilterableField<Entity>[] | "all",
    strategy?: "include" | "exclude",
    entityType?: ReceiveType<Entity>,
  ): ReflectionClass<any> {
    return super.build(fields, strategy, entityType);
  }

  protected static override selectValidFields<Entity>(
    entitySchema: ReflectionClass<any>,
  ): FilterableField<Entity>[] {
    return entitySchema
      .getProperties()
      .map((schema) =>
        isFilterableField<Entity>(schema.name, schema)
          ? schema.name
          : undefined,
      )
      .filter((v): v is NonNullable<typeof v> => !!v);
  }

  protected static override transformField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): AddPropertyOptions {
    const isRelation =
      fieldSchema.isReference() || fieldSchema.isBackReference();
    const fieldSchemaToUse = isRelation
      ? fieldSchema.getResolvedReflectionClass().getPrimary()
      : fieldSchema;
    return {
      name: fieldSchema.name,
      type: ResourceFilterMapFactory.buildOperatorMap(fieldSchemaToUse),
      optional: true,
    };
  }

  private static buildOperatorMap(
    fieldSchema: ReflectionProperty,
  ): TypeObjectLiteral {
    const { kind, type } = fieldSchema.property as TypePropertySignature;
    const result: TypeObjectLiteral = {
      kind: ReflectionKind.objectLiteral,
      types: [],
    };
    const resultPropertyTypes = [
      ...["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"],
    ].map(
      (name): TypePropertySignature => ({
        name,
        kind,
        parent: result,
        type: ["$in", "$nin"].includes(name)
          ? { kind: ReflectionKind.array, type }
          : type,
        optional: true,
      }),
    );
    result.types = resultPropertyTypes;
    return result;
  }
}

type FilterableField<Entity> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [Field in FieldName<Entity>]: Entity[Field] extends Function | unknown[]
    ? never
    : Field;
}[FieldName<Entity>];

function isFilterableField<Entity>(
  field: unknown,
  schema: ReflectionProperty,
): field is FilterableField<Entity> {
  return (
    schema.name === field &&
    !schema.isArray() &&
    schema.isPublic() &&
    schema.type.kind !== ReflectionKind.function
  );
}
