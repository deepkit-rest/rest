import { HttpNotFoundError } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // we have to use namespace import for `Query` here, otherwise the application will stuck and cannot bootstrap (bug)
import { FieldName, FilterQuery } from "@deepkit/orm";

import { ResourceAdapter } from "./resource.adapter";
import { ResourceFilterMap } from "./resource-filter.typings";
import { ResourceList, ResourcePagination } from "./resource-listing.typings";
import { ResourceOrderMap } from "./resource-order.typings";

export class ResourceService<Entity> {
  constructor(private adapter?: ResourceAdapter<Entity>) {}

  async list(
    query: orm.Query<Entity>,
    { pagination, filter, order }: ResourceListingOptions<Entity>,
  ): Promise<ResourceList<Entity>> {
    query = this.adapter?.prepareQuery?.(query) ?? query;
    if (pagination) this.applyPagination(query, pagination);
    if (filter) query = this.applyFilterMap(query, filter);
    if (order) query = this.applyOrderMap(query, order);
    const total = await query.count();
    const items = await query.find();
    return { total, items };
  }

  async retrieve(
    query: orm.Query<Entity>,
    condition: FilterQuery<Entity>,
  ): Promise<Entity> {
    query = this.adapter?.prepareQuery?.(query) ?? query;
    const entity = await query.filter(condition).findOneOrUndefined();
    if (!entity) throw new HttpNotFoundError();
    return entity;
  }

  applyPagination(
    query: orm.Query<Entity>,
    { limit, offset }: ResourcePagination,
  ): orm.Query<Entity> {
    return query.limit(limit).skip(offset);
  }

  applyFilterMap(
    query: orm.Query<Entity>,
    filterMap: ResourceFilterMap<Entity, any>,
  ): orm.Query<Entity> {
    Object.entries(filterMap).forEach(([field, condition]) => {
      query = query.addFilter(field as FieldName<Entity>, condition);
    });
    return query;
  }

  applyOrderMap<Entity>(
    query: orm.Query<Entity>,
    orderMap: ResourceOrderMap<Entity, any>,
  ): orm.Query<Entity> {
    Object.entries(orderMap).forEach(([field, order]) => {
      query = query.orderBy(field as FieldName<Entity>, order);
    });
    return query;
  }
}

export interface ResourceListingOptions<Entity> {
  pagination?: ResourcePagination;
  filter?: ResourceFilterMap<Entity>;
  order?: ResourceOrderMap<Entity>;
}
