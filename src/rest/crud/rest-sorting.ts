import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { InlineRuntimeType } from "@deepkit/type";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";
import { RestOrderMapFactory } from "../crud-models/rest-order-map";

export interface RestSortingCustomizations {
  sorters?: ClassType<RestSorter>[];
}

export interface RestSorter {
  sort<Entity>(context: RestActionContext, query: Query<Entity>): Query<Entity>;
}

export class RestGenericSorter implements RestSorter {
  readonly param = "order";

  constructor(
    protected contextReader: RestActionContextReader,
    protected orderMapFactory: RestOrderMapFactory,
  ) {}

  sort<Entity>(
    context: RestActionContext<any>,
    query: Query<Entity>,
  ): Query<Entity> {
    const { entityType } = context.resourceMeta;

    const orderMapSchema = this.orderMapFactory.build(entityType).type;
    const orderMapParam = this.param;
    interface Queries {
      [orderMapParam]?: InlineRuntimeType<typeof orderMapSchema>;
    }
    const orderMap: object | undefined =
      this.contextReader.parseQueries<Queries>(context)[orderMapParam];

    if (orderMap)
      Object.entries(orderMap).forEach(([field, order]) => {
        query = query.orderBy(field as FieldName<Entity>, order as any);
      });

    return query;
  }
}
