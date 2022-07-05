import { ClassType } from "@deepkit/core";
import { HttpNotFoundError } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
import { ReflectionClass } from "@deepkit/type";
import { purify } from "src/common/type";
import {
  RestActionContext,
  RestActionContextReader,
} from "src/rest/rest-action";

import { RestFilterMapFactory } from "./models/rest-filter-map";
import { RestList, RestPagination } from "./models/rest-list";
import { RestOrderMapFactory } from "./models/rest-order-map";
import { RestResource } from "./rest-resource";

export class RestCrudService {
  constructor(
    private contextReader: RestActionContextReader,
    private filterMapFactory: RestFilterMapFactory,
    private orderMapFactory: RestOrderMapFactory,
  ) {}

  async list<Entity>(
    context: RestActionContext<Entity>,
  ): Promise<RestList<Entity>> {
    const { entityType } = context.resourceMeta;

    const filterMapSchema = this.filterMapFactory.build(entityType);
    const orderMapSchema = this.orderMapFactory.build(entityType);
    const queries = this.contextReader.parseQueries(context);
    const filterMap = purify(queries["filter"] ?? {}, filterMapSchema.type);
    const orderMap = purify(queries["order"] ?? {}, orderMapSchema.type);
    const pagination = purify<RestPagination>(queries);

    const resource = this.contextReader.getResource(context);
    let query = resource.query();
    query = this.applyFilterMap(query, entityType, filterMap as object);
    const total = await query.count();
    query = this.applyPagination(query, pagination);
    query = this.applyOrderMap(query, orderMap as object);
    const items = await query.find();

    return { total, items };
  }

  async retrieve<Entity>(context: RestActionContext<Entity>): Promise<Entity> {
    const { actionMeta } = context;
    const resource: RestResource<Entity> & RestCrudCustomizations =
      this.contextReader.getResource(context);
    if (!actionMeta.detailed) throw new Error("Not a detailed action");
    const [fieldName, fieldValueRaw] =
      this.contextReader.getLookupInfo(context);
    const fieldValue: any = resource.lookup
      ? resource.lookup(fieldValueRaw)
      : fieldValueRaw;
    const result = await resource
      .query()
      .addFilter(fieldName, fieldValue)
      .findOneOrUndefined();
    if (!result) throw new HttpNotFoundError();
    return result;
  }

  applyPagination<Entity>(
    query: orm.Query<Entity>,
    { limit, offset }: RestPagination,
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
    orderMap: object,
  ): orm.Query<Entity> {
    Object.entries(orderMap).forEach(([field, order]) => {
      query = query.orderBy(field as FieldName<Entity>, order);
    });
    return query;
  }
}

export interface RestCrudCustomizations {
  lookup?(raw: unknown): unknown;
}
