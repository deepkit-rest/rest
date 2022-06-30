import { ClassType } from "@deepkit/core";
import { HttpNotFoundError } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // we have to use namespace import for `Query` here, otherwise the application will stuck and cannot bootstrap (bug)
import { FieldName, FilterQuery } from "@deepkit/orm";
import { ReflectionClass, TypeClass } from "@deepkit/type";
import { appendFilter } from "src/common/orm";

import { RestCrudList, RestCrudPagination } from "./models/rest-crud-list";
import { RestCrudOrderMap } from "./models/rest-crud-order-map";
import { RestCrudAdapter } from "./rest-crud-crud-adapter.interface";

export class RestCrudHandler<Entity> {
  private adapterSchema;
  private entitySchema;
  constructor(private adapter: RestCrudAdapter<Entity>) {
    const adapterClassType = adapter.constructor as ClassType<typeof adapter>;
    this.adapterSchema = ReflectionClass.from(adapterClassType);
    const adapterType = this.adapterSchema.type as TypeClass;
    const entityClassType = adapterType.extendsArguments?.[0];
    this.entitySchema = ReflectionClass.from(entityClassType);
  }

  async list(
    { pagination, filter, order }: RestCrudListingOptions<Entity>, //
  ): Promise<RestCrudList<Entity>> {
    let query = this.adapter.query();
    if (filter) query = this.applyFilterMap(query, filter);
    const total = await query.count();
    query = this.applyPagination(query, pagination);
    if (order) query = this.applyOrderMap(query, order);
    const items = await query.find();
    return { total, items };
  }

  async retrieve(condition: FilterQuery<Entity>): Promise<Entity> {
    let query = this.adapter.query();
    query = appendFilter(query, condition);
    const entity = await query.findOneOrUndefined();
    if (!entity) throw new HttpNotFoundError();
    return entity;
  }

  applyPagination(
    query: orm.Query<Entity>,
    { limit, offset }: RestCrudPagination,
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
    orderMap: RestCrudOrderMap<Entity, any>,
  ): orm.Query<Entity> {
    Object.entries(orderMap).forEach(([field, order]) => {
      query = query.orderBy(field as FieldName<Entity>, order);
    });
    return query;
  }
}

export interface RestCrudListingOptions<Entity> {
  pagination: RestCrudPagination;
  filter?: object;
  order?: RestCrudOrderMap<Entity>;
}
