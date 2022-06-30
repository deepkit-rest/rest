import { ClassType } from "@deepkit/core";
import { HttpNotFoundError } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // we have to use namespace import for `Query` here, otherwise the application will stuck and cannot bootstrap (bug)
import { FieldName, FilterQuery } from "@deepkit/orm";
import { ReflectionClass } from "@deepkit/type";
import { restClass } from "src/rest/rest.decorator";
import { RestResourceMetaValidated } from "src/rest/rest.meta";
import { RestQuery } from "src/rest/rest.query";
import { RestResource } from "src/rest/rest-resource";

import { RestCrudList, RestCrudPagination } from "./models/rest-crud-list";
import { RestCrudOrderMap } from "./models/rest-crud-order-map";

export class RestCrudHandler {
  async list<Entity>(
    resource: RestResource<Entity>,
    { pagination, filter, order }: RestCrudListingOptions<Entity>, //
  ): Promise<RestCrudList<Entity>> {
    let query = resource.query();
    const { entityType } = this.getResourceMeta(resource);
    if (filter) query = this.applyFilterMap(query, entityType, filter);
    const total = await query.count();
    query = this.applyPagination(query, pagination);
    if (order) query = this.applyOrderMap(query, order);
    const items = await query.find();
    return { total, items };
  }

  async retrieve<Entity>(
    resource: RestResource<Entity>,
    condition: FilterQuery<Entity>,
  ): Promise<Entity> {
    let query = resource.query();
    query = query.lift(RestQuery).filterAppend(condition) as RestQuery<Entity>; // temporary workaround: type inferring is problematic
    const entity = await query.findOneOrUndefined();
    if (!entity) throw new HttpNotFoundError();
    return entity;
  }

  applyPagination<Entity>(
    query: orm.Query<Entity>,
    { limit, offset }: RestCrudPagination,
  ): orm.Query<Entity> {
    if (limit) query = query.limit(limit);
    if (offset) query = query.skip(offset);
    return query;
  }

  applyFilterMap<Entity>(
    query: orm.Query<Entity>,
    entityType: ClassType<Entity>,
    filterMap: object,
  ): orm.Query<Entity> {
    const database = query["session"]; // hack
    const entitySchema = ReflectionClass.from(entityType);
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

  applyOrderMap<Entity>(
    query: orm.Query<Entity>,
    orderMap: RestCrudOrderMap<Entity, any>,
  ): orm.Query<Entity> {
    Object.entries(orderMap).forEach(([field, order]) => {
      query = query.orderBy(field as FieldName<Entity>, order);
    });
    return query;
  }

  private getResourceMeta<Entity>(resource: RestResource<Entity>) {
    const meta = restClass
      ._fetch(resource.constructor as ClassType)
      ?.validate();
    if (!meta) throw new Error("Cannot read resource meta");
    return meta as RestResourceMetaValidated<Entity>;
  }
}

export interface RestCrudListingOptions<Entity> {
  pagination: RestCrudPagination;
  filter?: object;
  order?: RestCrudOrderMap<Entity>;
}
