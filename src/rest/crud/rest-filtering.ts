import { ClassType } from "@deepkit/core";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
import { InlineRuntimeType, ReflectionClass } from "@deepkit/type";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";
import { RestFilterMapFactory } from "../crud-models/rest-filter-map";

export interface RestFilteringCustomizations {
  filters?: ClassType<RestFilter>[];
}

export interface RestFilter {
  filter<Entity>(
    context: RestActionContext,
    query: orm.Query<Entity>,
  ): orm.Query<Entity>;
}

export class RestGenericFilter implements RestFilter {
  readonly param = "filter";

  constructor(
    protected contextReader: RestActionContextReader,
    protected filterMapFactory: RestFilterMapFactory,
  ) {}

  filter<Entity>(
    context: RestActionContext<any>,
    query: orm.Query<Entity>,
  ): orm.Query<Entity> {
    const database = query["session"]; // hack
    const entityType = context.resourceMeta.entityType;
    const entitySchema = ReflectionClass.from(entityType);

    const filterMapSchema = this.filterMapFactory.build(entityType);
    const filterMapParam = this.param;
    interface Queries {
      [filterMapParam]?: InlineRuntimeType<typeof filterMapSchema>;
    }
    const filterMap: object | undefined =
      this.contextReader.parseQueries<Queries>(context)[filterMapParam];

    if (filterMap)
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
