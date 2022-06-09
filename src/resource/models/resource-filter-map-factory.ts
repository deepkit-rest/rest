import { FieldName } from "@deepkit/orm";
import {
  ReceiveType,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
  TypeObjectLiteral,
  TypePropertySignature,
} from "@deepkit/type";

class ResourceFilterMap {}

export class ResourceFilterMapFactory {
  static build<Entity>(
    fields: FilterableField<Entity>[] | "all",
    strategy: "include" | "exclude" = "include",
    entityType?: ReceiveType<Entity>,
  ): ReflectionClass<any> {
    const entitySchema = ReflectionClass.from(entityType);
    const filterSchema = ReflectionClass.from(ResourceFilterMap).clone();
    if (fields === "all") {
      if (strategy === "include")
        fields = this.extractFilterableFields(entitySchema);
      else fields = [];
    } else if (strategy === "exclude") {
      const all = this.extractFilterableFields(entitySchema);
      fields = all.filter((field) => !fields.includes(field));
    }
    fields.forEach((field) => {
      const fieldSchema = entitySchema.getProperty(field);
      const isRelation =
        fieldSchema.isReference() || fieldSchema.isBackReference();
      const fieldSchemaToUse = isRelation
        ? fieldSchema.getResolvedReflectionClass().getPrimary()
        : fieldSchema;
      filterSchema.addProperty({
        name: fieldSchema.name,
        type: ResourceFilterMapFactory.buildOperatorMap(fieldSchemaToUse),
        optional: true,
      });
    });
    return filterSchema;
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

  private static extractFilterableFields<Entity>(
    entitySchema: ReflectionClass<any>,
  ) {
    return entitySchema
      .getProperties()
      .map((schema) =>
        isFilterableField<Entity>(schema.name, schema)
          ? schema.name
          : undefined,
      )
      .filter((v): v is NonNullable<typeof v> => !!v);
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
