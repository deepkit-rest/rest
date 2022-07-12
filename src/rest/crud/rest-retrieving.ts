import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { ReflectionProperty } from "@deepkit/type";
import { purify } from "src/common/type";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";
import { RestResource } from "../core/rest-resource";

export interface RestRetrievingCustomizations {
  retriever?: ClassType<RestRetriever>;
}

export interface RestRetriever {
  retrieve<Entity>(
    context: RestActionContext,
    query: Query<Entity>,
  ): Query<Entity>;
}

export class RestFieldBasedRetriever implements RestRetriever {
  constructor(protected contextReader: RestActionContextReader) {}

  retrieve<Entity>(
    context: RestActionContext<Entity>,
    query: Query<Entity>,
  ): Query<Entity> {
    const [, valueRaw] = this.contextReader.getLookupInfo(context);
    const entitySchema = this.contextReader.getEntitySchema(context);
    const fieldName = this.getFieldName(context);
    const fieldSchema = entitySchema.getProperty(fieldName);
    const value = this.transformValue(valueRaw, fieldSchema);
    return query.filterField(fieldName, value as any);
  }

  protected transformValue(raw: unknown, schema: ReflectionProperty): unknown {
    return purify(raw, schema.type);
  }

  protected getFieldName<Entity>(
    context: RestActionContext<Entity>,
  ): FieldName<Entity> {
    const resource: RestResource<Entity> &
      RestFieldBasedRetrieverCustomizations<Entity> =
      this.contextReader.getResource(context);
    const entitySchema = this.contextReader.getEntitySchema(context);
    const [lookupName] = this.contextReader.getLookupInfo(context);
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
