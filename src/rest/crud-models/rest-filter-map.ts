import { ClassType } from "@deepkit/core";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
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

export type Filterable = Data<"filterable", true>;

export class RestFilterMapFactory extends RestQueryModelFactory {
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

export class RestFilterMapApplier {
  apply<Entity>(
    query: orm.Query<Entity>,
    entityType: ClassType<Entity>,
    filterMap: object,
  ): orm.Query<Entity> {
    const database = query["session"]; // hack
    const entitySchema = ReflectionClass.from(entityType);
    Object.entries(filterMap).forEach(([field, condition]) => {
      const fieldSchema = entitySchema.getProperty(field);
      if (fieldSchema.isReference() || fieldSchema.isBackReference()) {
        const foreignSchema = fieldSchema.getResolvedReflectionClass();
        const getReference = (v: any) =>
          database.getReference(foreignSchema, v);
        Object.keys(condition).forEach((operator) => {
          condition[operator] =
            condition[operator] instanceof Array
              ? condition[operator].map(getReference)
              : getReference(condition[operator]);
        });
      }
      query = query.addFilter(field as FieldName<Entity>, condition);
    });
    return query;
  }
}
