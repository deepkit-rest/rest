import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { purify } from "src/common/type";
import { HttpRequestParsed } from "src/http-extension/http-request-parsed.service";

import { RestActionContext } from "../core/rest-action";
import { RestFilterMapFactory } from "../crud-models/rest-filter-map";
import { RestOrderMapFactory } from "../crud-models/rest-order-map";
import { RestQueryProcessor } from "./rest-crud";

export interface RestFilteringCustomizations {
  filters?: ClassType<RestEntityFilter>[];
}

export interface RestEntityFilter extends RestQueryProcessor {}

export class RestGenericFilter implements RestEntityFilter {
  param = "filter";

  constructor(
    protected request: HttpRequestParsed,
    protected context: RestActionContext,
    protected filterMapFactory: RestFilterMapFactory,
  ) {}

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const database = this.context.getResource().getDatabase();
    const entitySchema = this.context.getEntitySchema();
    const entityType = entitySchema.getClassType();

    const filterMapSchema = this.filterMapFactory.build(entityType);
    const filterMapParam = this.param;
    const queries = this.request.getQueries();
    const filterMap = purify<object>(
      queries[filterMapParam] ?? {},
      filterMapSchema.type,
    );

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

export class RestGenericSorter implements RestEntityFilter {
  param = "order";

  constructor(
    protected request: HttpRequestParsed,
    protected context: RestActionContext,
    protected orderMapFactory: RestOrderMapFactory,
  ) {}

  processQuery<Entity>(query: Query<Entity>): Query<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const orderMapSchema = this.orderMapFactory.build(entityType);
    const orderMapParam = this.param;
    const queries = this.request.getQueries();
    const orderMap = purify<object>(
      queries[orderMapParam] ?? {},
      orderMapSchema.type,
    );

    if (orderMap)
      Object.entries(orderMap).forEach(([field, order]) => {
        query = query.orderBy(field as FieldName<Entity>, order as any);
      });

    return query;
  }
}
