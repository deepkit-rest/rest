import { ClassType } from "@deepkit/core";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
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
    query: orm.Query<Entity>,
  ): orm.Query<Entity>;
}

export class RestFieldBasedRetriever implements RestRetriever {
  constructor(protected contextReader: RestActionContextReader) {}

  retrieve<Entity>(
    context: RestActionContext<Entity>,
    query: orm.Query<Entity>,
  ): orm.Query<Entity> {
    const [, valueRaw] = this.contextReader.getLookupInfo(context);
    const entitySchema = this.contextReader.getEntitySchema(context);
    const fieldName = this.getFieldName(context);
    const fieldSchema = entitySchema.getProperty(fieldName);
    const value = this.transformValue(valueRaw, fieldSchema);
    return query.addFilter(fieldName, value as any);
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
    if (entitySchema.hasProperty(lookupName))
      return entitySchema.getProperty(lookupName).name as FieldName<Entity>;
    return entitySchema.getPrimary().name as FieldName<Entity>;
  }
}

export interface RestFieldBasedRetrieverCustomizations<Entity> {
  retrievesOn?: FieldName<Entity>;
}
