import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { ReflectionProperty } from "@deepkit/type";
import { purify } from "src/common/type";

import { RestActionContext } from "../core/rest-action";
import { RestResource } from "../core/rest-resource";

export interface RestRetrievingCustomizations {
  retriever?: ClassType<RestRetriever>;
}

export interface RestRetriever {
  retrieve<Entity>(query: Query<Entity>): Query<Entity>;
}

export class RestFieldBasedRetriever implements RestRetriever {
  constructor(protected context: RestActionContext) {}

  retrieve<Entity>(query: Query<Entity>): Query<Entity> {
    const lookupName = this.context.getResourceMeta().lookup;
    const valueRaw = this.context.getRequestPathParams()[lookupName];
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
