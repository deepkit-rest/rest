import { ClassType } from "@deepkit/core";
import { HttpNotFoundError } from "@deepkit/http";
import { Query } from "@deepkit/orm";
import {
  HttpInjectorContext,
  HttpRouteConfig,
  NoContentResponse,
} from "src/http-extension/http-common";
import { HttpRequestContext } from "src/http-extension/http-request-context.service";

import { RestActionContext } from "../core/rest-action";
import { RestResource } from "../core/rest-resource";
import { RestFilteringCustomizations } from "./rest-filtering";
import {
  RestNoopPaginator,
  RestPaginationCustomizations,
} from "./rest-pagination";
import {
  RestFieldBasedRetriever,
  RestRetrievingCustomizations,
} from "./rest-retrieving";
import {
  RestEntitySerializer,
  RestGenericEntitySerializer,
  RestSerializationCustomizations,
} from "./rest-serialization";
import { RestSortingCustomizations } from "./rest-sorting";

export class RestCrudKernel {
  constructor(
    protected request: HttpRequestContext,
    protected injector: HttpInjectorContext,
    protected context: RestCrudActionContext,
  ) {}

  async list<Entity>(): Promise<RestList<Entity>> {
    const resource = this.context.getResource<Entity>();
    const filters = this.context.getFilters();
    const sorters = this.context.getSorters();
    const paginator = this.context.getPaginator();

    let query = resource.query();
    query = filters.reduce((q, p) => p.process(q), query);
    const total = await query.count();
    query = sorters.reduce((q, p) => p.process(q), query);
    query = paginator.process(query);
    const items = await query.find();

    return { total, items };
  }

  // TODO: return 201
  async create<Entity>(): Promise<Entity> {
    const serializer = this.context.getSerializer<Entity>();
    await this.request.loadBody();
    const payload = this.request.getBody();
    const entity = await serializer.deserializeCreation(payload);
    await this.saveEntity(entity);
    return entity;
  }

  async update<Entity>(): Promise<Entity> {
    const serializer = this.context.getSerializer<Entity>();
    await this.request.loadBody();
    const payload = this.request.getBody();
    let entity = await this.retrieve<Entity>();
    entity = await serializer.deserializeUpdate(entity, payload);
    await this.saveEntity(entity);
    return entity;
  }

  async retrieve<Entity>(): Promise<Entity> {
    if (!this.context.getActionMeta().detailed)
      throw new Error("Not a detailed action");
    const resource = this.context.getResource<Entity>();
    const retriever = this.context.getRetriever();
    const query = retriever.process(resource.query());
    const result = await query.findOneOrUndefined();
    if (!result) throw new HttpNotFoundError();
    return result;
  }

  async delete<Entity>(): Promise<NoContentResponse> {
    const entity = await this.retrieve<Entity>();
    await this.removeEntity(entity);
    return new NoContentResponse();
  }

  protected async saveEntity<Entity>(entity: Entity): Promise<void> {
    const database = this.context.getResource().query()["session"]; // hack
    database.add(entity);
    await database.flush();
  }

  protected async removeEntity<Entity>(entity: Entity): Promise<void> {
    const database = this.context.getResource().query()["session"]; // hack
    database.remove(entity);
    await database.flush();
  }
}

export interface RestQueryProcessor {
  process<Entity>(query: Query<Entity>): Query<Entity>;
}

export interface RestList<Entity> {
  total: number;
  items: Entity[];
}

export class RestCrudActionContext extends RestActionContext {
  constructor(injector: HttpInjectorContext, routeConfig: HttpRouteConfig) {
    super(injector, routeConfig);
  }

  override getResource<Entity>(): RestResource<Entity> &
    RestRetrievingCustomizations &
    RestPaginationCustomizations &
    RestFilteringCustomizations &
    RestSortingCustomizations &
    RestSerializationCustomizations<Entity> {
    return super.getResource();
  }

  getRetriever(): RestQueryProcessor {
    const resource = this.getResource();
    return this.getDep(resource.retriever ?? RestFieldBasedRetriever);
  }

  getPaginator(): RestQueryProcessor {
    const resource = this.getResource();
    return this.getDep(resource.paginator ?? RestNoopPaginator);
  }

  getFilters(): RestQueryProcessor[] {
    const resource = this.getResource();
    return resource.filters?.map((type) => this.getDep(type)) ?? [];
  }

  getSorters(): RestQueryProcessor[] {
    const resource = this.getResource();
    return resource.sorters?.map((type) => this.getDep(type)) ?? [];
  }

  getSerializer<Entity>(): RestEntitySerializer<Entity> {
    const resource = this.getResource<Entity>();
    return this.getDep(resource.serializer ?? RestGenericEntitySerializer);
  }

  getDep<Dep>(type: ClassType<Dep>): Dep {
    const module = this.getModule();
    return this.injector.resolve(module, type)();
  }
}
