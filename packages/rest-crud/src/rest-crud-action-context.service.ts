import { HttpNotFoundError } from "@deepkit/http";
import { RestActionContext, RestResource } from "@deepkit-rest/rest-core";

import {
  RestEntityFilter,
  RestFilteringCustomizations,
} from "./handlers/rest-filters";
import {
  RestEntityPaginator,
  RestNoopPaginator,
  RestPaginationCustomizations,
} from "./handlers/rest-paginators";
import {
  RestEntityRetriever,
  RestRetrievingCustomizations,
  RestSingleFieldRetriever,
} from "./handlers/rest-retrievers";
import {
  RestEntitySerializer,
  RestGenericSerializer,
  RestSerializationCustomizations,
} from "./handlers/rest-serializers";

export class RestCrudActionContext<Entity> extends RestActionContext {
  async getEntity(): Promise<Entity> {
    return this.cache.getOrCreateAsync(this.getEntity, async () => {
      const resource = this.getResource();
      const retriever = this.getRetriever();
      const query = retriever.processQuery(resource.getQuery());
      const entity = await query.findOneOrUndefined();
      if (!entity) throw new HttpNotFoundError();
      return entity;
    });
  }

  override getResource<Customizations>(): RestResource<Entity> &
    RestRetrievingCustomizations &
    RestPaginationCustomizations &
    RestFilteringCustomizations &
    RestSerializationCustomizations<Entity> &
    Customizations {
    return super.getResource() as any;
  }

  getRetriever(): RestEntityRetriever {
    const resource = this.getResource();
    return this.resolveDep(resource.retriever ?? RestSingleFieldRetriever);
  }

  getPaginator(): RestEntityPaginator {
    const resource = this.getResource();
    return this.resolveDep(resource.paginator ?? RestNoopPaginator);
  }

  getFilters(): RestEntityFilter[] {
    const resource = this.getResource();
    return resource.filters?.map((type) => this.resolveDep(type)) ?? [];
  }

  getSerializer(): RestEntitySerializer<Entity> {
    const resource = this.getResource();
    return this.resolveDep(resource.serializer ?? RestGenericSerializer);
  }
}
