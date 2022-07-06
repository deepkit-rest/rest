import { HttpNotFoundError } from "@deepkit/http";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";
import { RestResource } from "../core/rest-resource";
import { RestFilteringCustomizations } from "./rest-filtering";
import { RestPaginationCustomizations } from "./rest-pagination";
import {
  RestFieldBasedRetriever,
  RestRetrievingCustomizations,
} from "./rest-retrieving";

export class RestCrudService {
  constructor(private contextReader: RestActionContextReader) {}

  async list<Entity>(
    context: RestActionContext<Entity>,
  ): Promise<RestList<Entity>> {
    const resource: RestResource<Entity> &
      RestPaginationCustomizations &
      RestFilteringCustomizations = this.contextReader.getResource(context);

    let query = resource.query();
    resource.filters?.forEach((type) => {
      query = this.contextReader
        .getProvider(context, type)
        .filter(context, query);
    });
    const total = await query.count();
    if (resource.paginator)
      query = this.contextReader
        .getProvider(context, resource.paginator)
        .paginate(context, query);
    const items = await query.find();

    return { total, items };
  }

  async retrieve<Entity>(context: RestActionContext<Entity>): Promise<Entity> {
    const { actionMeta } = context;
    if (!actionMeta.detailed) throw new Error("Not a detailed action");
    const resource: RestResource<Entity> & RestRetrievingCustomizations =
      this.contextReader.getResource(context);
    const retrieverType = resource.retriever ?? RestFieldBasedRetriever;
    const retriever = this.contextReader.getProvider(context, retrieverType);
    const query = retriever.retrieve(context, resource.query());
    const result = await query.findOneOrUndefined();
    if (!result) throw new HttpNotFoundError();
    return result;
  }
}

export interface RestList<Entity> {
  total: number;
  items: Entity[];
}
