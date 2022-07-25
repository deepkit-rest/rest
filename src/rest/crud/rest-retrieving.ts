import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { ReflectionProperty } from "@deepkit/type";
import { purify } from "src/common/type";
import { HttpRequestParsed } from "src/http-extension/http-request-parsed.service";

import { RestActionContext } from "../core/rest-action";
import { RestResource } from "../core/rest-resource";
import { RestQueryProcessor } from "./rest-crud";

export interface RestRetrievingCustomizations {
  retriever?: ClassType<RestEntityRetriever>;
}

export interface RestEntityRetriever extends RestQueryProcessor {}

export class RestFieldBasedRetriever implements RestEntityRetriever {
  constructor(
    protected request: HttpRequestParsed,
    protected context: RestActionContext,
  ) {}

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const lookupName = this.context.getResourceMeta().lookup;
    const valueRaw = this.request.getPathParams()[lookupName];
    if (!valueRaw)
      throw new Error("Path parameter missing for entity retrieving");
    const entitySchema = this.context.getEntitySchema();
    const fieldName = this.getFieldName();
    const fieldSchema = entitySchema.getProperty(fieldName);
    const value = this.transformValue(valueRaw, fieldSchema);
    return query.filterField(fieldName, value as any);
  }

  protected transformValue(raw: unknown, schema: ReflectionProperty): unknown {
    return purify(raw, schema.type);
  }

  protected getFieldName<Entity>(): FieldName<Entity> {
    const resource: RestResource<Entity> &
      RestFieldBasedRetrieverCustomizations<Entity> =
      this.context.getResource();
    const entitySchema = this.context.getEntitySchema();
    const lookupName = this.context.getResourceMeta().lookup;
    if (resource.retrievesOn) return resource.retrievesOn;
    if (lookupName === "pk")
      return entitySchema.getPrimary().name as FieldName<Entity>;
    if (entitySchema.hasProperty(lookupName))
      return entitySchema.getProperty(lookupName).name as FieldName<Entity>;
    throw new Error("Could not determine the field to retrieve on");
  }
}

export interface RestFieldBasedRetrieverCustomizations<Entity> {
  retrievesOn?: FieldName<Entity>;
}
