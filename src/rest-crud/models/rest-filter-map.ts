import {
  Data,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
  TypeObjectLiteral,
  TypePropertySignature,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

import { RestEntityModelFactory } from "./rest-entity-model";

export type Filterable = Data<"filterable", true>;

export class RestFilterMapFactory extends RestEntityModelFactory {
  protected selectFields(
    entitySchema: ReflectionClass<any>,
  ): ReflectionProperty[] {
    return entitySchema
      .getProperties()
      .filter((s) => s.getData()["filterable"]);
  }

  protected processField(
    entitySchema: ReflectionClass<any>,
    fieldSchema: ReflectionProperty,
  ): ReflectionClassAddPropertyOptions {
    if (fieldSchema.getType().kind === ReflectionKind.array)
      throw new Error("* to many relations are not supported");
    const isRelation =
      fieldSchema.isReference() || fieldSchema.isBackReference();
    const fieldSchemaToUse = isRelation
      ? fieldSchema.getResolvedReflectionClass().getPrimary()
      : fieldSchema;
    return {
      name: fieldSchema.name,
      type: this.buildOperatorMap(fieldSchemaToUse),
      optional: true,
    };
  }

  protected buildOperatorMap(
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
