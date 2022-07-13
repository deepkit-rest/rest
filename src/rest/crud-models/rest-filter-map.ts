import { ClassType } from "@deepkit/core";
import {
  Data,
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
  TypeObjectLiteral,
  TypePropertySignature,
} from "@deepkit/type";
import { ReflectionClassAddPropertyOptions } from "src/common/type";

import { RestQueryModelFactory } from "./rest-query-model";

// TODO: move to a better place

export type Filterable = Data<"filterable", true>;

export class RestFilterMapFactory extends RestQueryModelFactory {
  protected products = new Map<ClassType<any>, ReflectionClass<any>>();

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
