import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { InlineRuntimeType } from "@deepkit/type";

import { RestActionContext } from "../core/rest-action";
import { RestFilterMapFactory } from "../crud-models/rest-filter-map";

export interface RestFilteringCustomizations {
  filters?: ClassType<RestFilter>[];
}

export interface RestFilter {
  filter<Entity>(query: Query<Entity>): Query<Entity>;
}

export class RestGenericFilter implements RestFilter {
  readonly param = "filter";

  constructor(
    protected context: RestActionContext,
    protected filterMapFactory: RestFilterMapFactory,
  ) {}

  filter<Entity>(query: Query<Entity>): Query<Entity> {
    const database = query["session"]; // hack
    const entitySchema = this.context.getEntitySchema();
    const entityType = entitySchema.getClassType();

    const filterMapSchema = this.filterMapFactory.build(entityType);
    const filterMapParam = this.param;
    interface Queries {
      [filterMapParam]?: InlineRuntimeType<typeof filterMapSchema>;
    }
    const filterMap: object | undefined =
      this.context.getRequestQueries<Queries>()[filterMapParam];

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
        query = query.filterField(field as FieldName<Entity>, condition);
      });

    return query;
  }
}
