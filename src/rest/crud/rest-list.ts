import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";
import { RestResource } from "../core/rest-resource";
import { RestFilteringCustomizations } from "./rest-filtering";
import { RestPaginationCustomizations } from "./rest-pagination";

export class RestListService {
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
}

export interface RestList<Entity> {
  total: number;
  items: Entity[];
}
