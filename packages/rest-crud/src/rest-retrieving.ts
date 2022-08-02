import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { ReflectionProperty } from "@deepkit/type";
import { purify } from "@deepkit-rest/common";
import { HttpRequestParsed } from "@deepkit-rest/http-extension";

import { RestCrudActionContext, RestQueryProcessor } from "./rest-crud-kernel";

export interface RestRetrievingCustomizations {
  retriever?: ClassType<RestEntityRetriever>;
}

export interface RestEntityRetriever extends RestQueryProcessor {}

export class RestSingleFieldRetriever implements RestEntityRetriever {
  constructor(
    protected request: HttpRequestParsed,
    protected context: RestCrudActionContext<never>,
  ) {}

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const [paramName, fieldName] = this.getParamNameAndFieldName<Entity>();
    const entitySchema = this.context.getEntitySchema();
    const valueRaw = this.request.getPathParams()[paramName];
    if (!valueRaw) throw new Error("Missing path parameter");
    const fieldSchema = entitySchema.getProperty(fieldName);
    const value = this.transformValue(valueRaw, fieldSchema);
    return query.filterField(fieldName as FieldName<Entity>, value as any);
  }

  getParamNameAndFieldName<Entity>(): [string, FieldName<Entity>] {
    const resource =
      this.context.getResource<
        RestSingleFieldRetrieverCustomizations<Entity>
      >();
    const entitySchema = this.context.getEntitySchema();
    if (!resource.retrievesOn)
      return ["pk", entitySchema.getPrimary().getName() as FieldName<Entity>];
    if (entitySchema.hasProperty(resource.retrievesOn))
      return [resource.retrievesOn, resource.retrievesOn as FieldName<Entity>];
    if (resource.retrievesOn.includes("->")) {
      const [paramName, fieldName] = resource.retrievesOn.split("->");
      return [paramName, fieldName as FieldName<Entity>];
    }
    throw new Error(`Invalid customization: ${resource.retrievesOn}`);
  }

  protected transformValue(raw: unknown, schema: ReflectionProperty): unknown {
    return purify(raw, schema.type);
  }
}

export interface RestSingleFieldRetrieverCustomizations<Entity> {
  retrievesOn?: FieldName<Entity> | `${string}->${FieldName<Entity>}`;
}
