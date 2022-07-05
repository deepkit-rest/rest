import { HttpNotFoundError } from "@deepkit/http";
import { purify } from "src/common/type";
import {
  RestActionContext,
  RestActionContextReader,
} from "src/rest/core/rest-action";

import { RestResource } from "../core/rest-resource";
import {
  RestFilterMapApplier,
  RestFilterMapFactory,
} from "../crud-models/rest-filter-map";
import {
  RestList,
  RestPagination,
  RestPaginationApplier,
} from "../crud-models/rest-list";
import {
  RestOrderMapApplier,
  RestOrderMapFactory,
} from "../crud-models/rest-order-map";

export class RestCrudService {
  constructor(
    private contextReader: RestActionContextReader,
    private filterMapFactory: RestFilterMapFactory,
    private filterMapApplier: RestFilterMapApplier,
    private orderMapFactory: RestOrderMapFactory,
    private orderMapApplier: RestOrderMapApplier,
    private paginationApplier: RestPaginationApplier,
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
    query = this.filterMapApplier.apply(query, entityType, filterMap as object);
    const total = await query.count();
    query = this.paginationApplier.apply(query, pagination);
    query = this.orderMapApplier.apply(query, orderMap as object);
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
}

export interface RestCrudCustomizations {
  lookup?(raw: unknown): unknown;
}
