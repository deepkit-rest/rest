import { ClassType } from "@deepkit/core";
import { HttpNotFoundError } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { FieldName } from "@deepkit/orm";
import { ReflectionClass } from "@deepkit/type";
import { purify } from "src/common/type";
import { HttpInjectorContext } from "src/http-extension/http-common";
import { HttpRequestParser } from "src/http-extension/http-request-parser.service";
import { RestActionContext } from "src/rest/rest-action";

import { RestCrudFilterMapFactory } from "./models/rest-crud-filter-map-factory";
import { RestCrudList, RestCrudPagination } from "./models/rest-crud-list";
import { RestCrudOrderMapFactory } from "./models/rest-crud-order-map-factory";

export class RestCrudService {
  constructor(
    private injector: HttpInjectorContext,
    private filterMapFactory: RestCrudFilterMapFactory,
    private orderMapFactory: RestCrudOrderMapFactory,
    private requestParser: HttpRequestParser,
  ) {}

  async list<Entity>(
    context: RestActionContext<Entity>,
  ): Promise<RestCrudList<Entity>> {
    const {
      request,
      resourceMeta: { entityType, classType: resourceType },
      module,
    } = context;

    const filterMapSchema = this.filterMapFactory.build(entityType);
    const orderMapSchema = this.orderMapFactory.build(entityType);
    const { queries } = this.requestParser.parseUrl(request.getUrl());
    const filterMap = purify(queries["filter"] ?? {}, filterMapSchema.type);
    const orderMap = purify(queries["order"] ?? {}, orderMapSchema.type);
    const pagination = purify<RestCrudPagination>(queries);

    const resource = this.injector.get(resourceType, module);
    let query = resource.query();
    query = this.applyFilterMap(query, entityType, filterMap);
    const total = await query.count();
    query = this.applyPagination(query, pagination);
    query = this.applyOrderMap(query, orderMap);
    const items = await query.find();

    return { total, items };
  }

  async retrieve<Entity>(context: RestActionContext<Entity>): Promise<Entity> {
    const { resourceMeta, actionMeta, actionParameters, module } = context;
    if (!actionMeta.detailed) throw new Error("Not a detailed action");
    const fieldName = resourceMeta.lookup;
    if (!fieldName) throw new Error("Lookup not specified");
    const entitySchema = ReflectionClass.from(resourceMeta.entityType);
    const fieldType = entitySchema.getProperty(fieldName).type;
    const fieldValue = purify(actionParameters[fieldName], fieldType) as any;
    const resource = this.injector.get(resourceMeta.classType, module);
    const result = await resource
      .query()
      .addFilter(fieldName, fieldValue)
      .findOneOrUndefined();
    if (!result) throw new HttpNotFoundError();
    return result;
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
    orderMap: object,
  ): orm.Query<Entity> {
    Object.entries(orderMap).forEach(([field, order]) => {
      query = query.orderBy(field as FieldName<Entity>, order);
    });
    return query;
  }
}
