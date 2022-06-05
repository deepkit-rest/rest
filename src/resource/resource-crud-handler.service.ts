import { ClassType } from "@deepkit/core";
import { HttpNotFoundError } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // we have to use namespace import for `Query` here, otherwise the application will stuck and cannot bootstrap (bug)
import { FieldName, FilterQuery } from "@deepkit/orm";
import { ReflectionClass, TypeClass } from "@deepkit/type";

import { ResourceCrudAdapter } from "./resource-crud-adapter.interface";
import { ResourceList, ResourcePagination } from "./resource-listing.typings";
import { ResourceOrderMap } from "./resource-order.typings";

export class ResourceCrudHandler<Entity> {
  private adapterSchema;
  private entitySchema;
  constructor(private adapter: ResourceCrudAdapter<Entity>) {
    const adapterClassType = adapter.constructor as ClassType<typeof adapter>;
    this.adapterSchema = ReflectionClass.from(adapterClassType);
    const adapterType = this.adapterSchema.type as TypeClass;
    const entityClassType = adapterType.extendsArguments?.[0];
    this.entitySchema = ReflectionClass.from(entityClassType);
  }

  async list(
    { pagination, filter, order }: ResourceListingOptions<Entity>, //
  ): Promise<ResourceList<Entity>> {
    let query = this.adapter.query();
    if (filter) query = this.applyFilterMap(query, filter);
    const total = await query.count();
    query = this.applyPagination(query, pagination);
    if (order) query = this.applyOrderMap(query, order);
    const items = await query.find();
    return { total, items };
  }

  async retrieve(condition: FilterQuery<Entity>): Promise<Entity> {
    const query = this.adapter.query();
    const entity = await query.filter(condition).findOneOrUndefined();
    if (!entity) throw new HttpNotFoundError();
    return entity;
  }

  applyPagination(
    query: orm.Query<Entity>,
    { limit, offset }: ResourcePagination,
  ): orm.Query<Entity> {
    if (limit) query = query.limit(limit);
    if (offset) query = query.skip(offset);
    return query;
  }

  applyFilterMap(
    query: orm.Query<Entity>,
    filterMap: object,
  ): orm.Query<Entity> {
    const database = query["session"];
    Object.entries(filterMap).forEach(([field, condition]) => {
      const fieldSchema = this.entitySchema.getProperty(field);
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
  pagination: ResourcePagination;
  filter?: object;
  order?: ResourceOrderMap<Entity>;
}
