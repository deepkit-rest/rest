import { ClassType } from "@deepkit/core";
import { FieldName, Query } from "@deepkit/orm";
import { InlineRuntimeType } from "@deepkit/type";

import { RestActionContext } from "../core/rest-action";
import { RestOrderMapFactory } from "../crud-models/rest-order-map";
import { RestQueryProcessor } from "./rest-crud";

export interface RestSortingCustomizations {
  sorters?: ClassType<RestQueryProcessor>[];
}

export class RestGenericSorter implements RestQueryProcessor {
  readonly param = "order";

  constructor(
    protected context: RestActionContext,
    protected orderMapFactory: RestOrderMapFactory,
  ) {}

  process<Entity>(query: Query<Entity>): Query<Entity> {
    const entityType = this.context.getEntitySchema().getClassType();
    const orderMapSchema = this.orderMapFactory.build(entityType).type;
    const orderMapParam = this.param;
    interface Queries {
      [orderMapParam]?: InlineRuntimeType<typeof orderMapSchema>;
    }
    const orderMap: object | undefined =
      this.context.getRequestQueries<Queries>()[orderMapParam];

    if (orderMap)
      Object.entries(orderMap).forEach(([field, order]) => {
        query = query.orderBy(field as FieldName<Entity>, order as any);
      });

    return query;
  }
}
