import { ClassType } from "@deepkit/core";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
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
  sort<Entity>(
    context: RestActionContext,
    query: orm.Query<Entity>,
  ): orm.Query<Entity>;
}

export class RestGenericSorter implements RestSorter {
  readonly param = "order";

  constructor(
    protected contextReader: RestActionContextReader,
    protected orderMapFactory: RestOrderMapFactory,
  ) {}

  sort<Entity>(
    context: RestActionContext<any>,
    query: orm.Query<Entity>,
  ): orm.Query<Entity> {
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
