import { ClassType } from "@deepkit/core";
import { HttpNotFoundError, Response } from "@deepkit/http";
import { Query } from "@deepkit/orm";
import { HttpInjectorContext } from "src/http-extension/http-common";
import { HttpRequestContext } from "src/http-extension/http-request-context.service";

import { RestActionContext } from "../core/rest-action";
import { RestResource } from "../core/rest-resource";
import {
  RestEntityFilter,
  RestFilteringCustomizations,
} from "./rest-filtering";
import {
  RestEntityPaginator,
  RestNoopPaginator,
  RestPaginationCustomizations,
} from "./rest-pagination";
import {
  RestEntityRetriever,
  RestFieldBasedRetriever,
  RestRetrievingCustomizations,
} from "./rest-retrieving";
import {
  RestEntitySerializer,
  RestGenericEntitySerializer,
  RestSerializationCustomizations,
} from "./rest-serialization";
import { RestEntitySorter, RestSortingCustomizations } from "./rest-sorting";

export class RestCrudKernel<Entity> {
  constructor(
    protected request: HttpRequestContext,
    protected injector: HttpInjectorContext,
    protected context: RestCrudActionContext<Entity>,
  ) {}

  async list(): Promise<Response> {
    const resource = this.context.getResource();
    const filters = this.context.getFilters();
    const sorters = this.context.getSorters();
    const paginator = this.context.getPaginator();
    const serializer = this.context.getSerializer();

    let query = resource.query();
    query = filters.reduce((q, p) => p.processQuery(q), query);
    const total = await query.count();
    query = sorters.reduce((q, p) => p.processQuery(q), query);
    query = paginator.processQuery(query);
    const entities = await query.find();

    const itemPromises = entities.map((e) => serializer.serialize(e));
    const items = await Promise.all(itemPromises);
    const body = { total, items };
    return this.createResponse(body, 200);
  }

  async create(): Promise<Response> {
    const serializer = this.context.getSerializer();

    await this.request.loadBody();
    const payload = this.request.getBody();
    const entity = await serializer.deserializeCreation(payload);
    await this.saveEntity(entity);

    const body = await serializer.serialize(entity);
    return this.createResponse(body, 201);
  }

  async update(): Promise<Response> {
    const serializer = this.context.getSerializer();

    await this.request.loadBody();
    const payload = this.request.getBody();
    let entity = await this.context.getEntity();
    entity = await serializer.deserializeUpdate(entity, payload);
    await this.saveEntity(entity);

    const body = await serializer.serialize(entity);
    return this.createResponse(body, 200);
  }

  async retrieve(): Promise<Response> {
    const serializer = this.context.getSerializer();

    const entity = await this.context.getEntity();

    const body = await serializer.serialize(entity);
    return this.createResponse(body, 200);
  }

  async delete(): Promise<Response> {
    const entity = await this.context.getEntity();
    await this.removeEntity(entity);

    const body = null;
    return this.createResponse(body, 204);
  }

  protected async saveEntity(entity: Entity): Promise<void> {
    const database = this.context.getResource().query()["session"]; // hack
    database.add(entity);
    await database.flush();
  }

  protected async removeEntity(entity: Entity): Promise<void> {
    const database = this.context.getResource().query()["session"]; // hack
    database.remove(entity);
    await database.flush();
  }

  protected createResponse(body: unknown, status: number): Response {
    const bodyStringified = body ? JSON.stringify(body) : "";
    const contentType = "application/json; charset=utf-8";
    return new Response(bodyStringified, contentType, status);
  }
}

export class RestCrudActionContext<Entity> extends RestActionContext {
  async getEntity(): Promise<Entity> {
    return this.getCacheOrCreateAsync(this.getCache, async () => {
      if (!this.getActionMeta().detailed)
        throw new Error("Not a detailed action");
      const resource = this.getResource();
      const retriever = this.getRetriever();
      const query = retriever.processQuery(resource.query());
      const entity = await query.findOneOrUndefined();
      if (!entity) throw new HttpNotFoundError();
      return entity;
    });
  }

  override getResource(): RestResource<Entity> &
    RestRetrievingCustomizations &
    RestPaginationCustomizations &
    RestFilteringCustomizations &
    RestSortingCustomizations &
    RestSerializationCustomizations<Entity> {
    return super.getResource();
  }

  getRetriever(): RestEntityRetriever {
    const resource = this.getResource();
    return this.getDep(resource.retriever ?? RestFieldBasedRetriever);
  }

  getPaginator(): RestEntityPaginator {
    const resource = this.getResource();
    return this.getDep(resource.paginator ?? RestNoopPaginator);
  }

  getFilters(): RestEntityFilter[] {
    const resource = this.getResource();
    return resource.filters?.map((type) => this.getDep(type)) ?? [];
  }

  getSorters(): RestEntitySorter[] {
    const resource = this.getResource();
    return resource.sorters?.map((type) => this.getDep(type)) ?? [];
  }

  getSerializer(): RestEntitySerializer<Entity> {
    const resource = this.getResource();
    return this.getDep(resource.serializer ?? RestGenericEntitySerializer);
  }

  getDep<Dep>(type: ClassType<Dep>): Dep {
    const module = this.getModule();
    return this.injector.resolve(module, type)();
  }
}

export interface RestQueryProcessor {
  processQuery<Entity>(query: Query<Entity>): Query<Entity>;
}

// temporary workaround: Serialization Goes Wrong when Return Type Is Response,
// JSONResponse or HtmlResponse.
// https://github.com/deepkit/deepkit-framework/issues/321
export type ResponseReturnType = any;
