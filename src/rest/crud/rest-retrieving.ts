import { ClassType } from "@deepkit/core";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
import { ReflectionClass, Type } from "@deepkit/type";
import { purify } from "src/common/type";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";

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
    const [name, valueRaw, type] = this.contextReader.getLookupInfo(context);
    if (!this.isField(name, context.resourceMeta.entityType))
      throw new Error("Invalid lookup value");
    const value = this.transformValue(valueRaw, type);
    return query.addFilter(name, value as any);
  }

  protected transformValue(raw: unknown, type: Type): unknown {
    return purify(raw, type);
  }

  protected isField<Entity>(
    name: string,
    entityType: ClassType<Entity>,
  ): name is FieldName<Entity> {
    const schema = ReflectionClass.from(entityType);
    return schema.hasProperty(name);
  }
}
