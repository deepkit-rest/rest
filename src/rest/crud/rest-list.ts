import { purify } from "src/common/type";
import { HttpInjectorContext } from "src/http-extension/http-common";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";
import { RestResource } from "../core/rest-resource";
import {
  RestFilterMapApplier,
  RestFilterMapFactory,
} from "../crud-models/rest-filter-map";
import {
  RestOrderMapApplier,
  RestOrderMapFactory,
} from "../crud-models/rest-order-map";
import {
  RestNoopPaginator,
  RestPaginatorCustomizations,
} from "./rest-pagination";

export class RestListService {
  constructor(
    private injector: HttpInjectorContext,
    private contextReader: RestActionContextReader,
    private filterMapFactory: RestFilterMapFactory,
    private filterMapApplier: RestFilterMapApplier,
    private orderMapFactory: RestOrderMapFactory,
    private orderMapApplier: RestOrderMapApplier,
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

    const resource: RestResource<Entity> & RestPaginatorCustomizations =
      this.contextReader.getResource(context);
    let query = resource.query();

    const paginator =
      resource.paginator ?? this.injector.get(RestNoopPaginator);

    query = this.filterMapApplier.apply(query, entityType, filterMap as object);
    const total = await query.count();
    query = paginator.paginate(context, query);
    query = this.orderMapApplier.apply(query, orderMap as object);
    const items = await query.find();

    return { total, items };
  }
}

export interface RestList<Entity> {
  total: number;
  items: Entity[];
}
