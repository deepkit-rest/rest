import { Response } from "@deepkit/http";
import {
  HttpInjectorContext,
  HttpRequestParsed,
} from "@deepkit-rest/http-extension";

import { RestCrudActionContext } from "./rest-crud-action-context.service";

export class RestCrudKernel<Entity> {
  constructor(
    protected request: HttpRequestParsed,
    protected injector: HttpInjectorContext,
    protected context: RestCrudActionContext<Entity>,
  ) {}

  async list(): Promise<Response> {
    const resource = this.context.getResource();
    const filters = this.context.getFilters();
    const paginator = this.context.getPaginator();
    const serializer = this.context.getSerializer();

    let query = resource.getQuery();
    query = filters.reduce((q, p) => p.processQuery(q), query);
    const totalQuery = query;
    const total = async () => totalQuery.count();
    query = paginator.processQuery(query);
    const itemsQuery = query;
    const items = async () =>
      itemsQuery
        .find()
        .then((entities) => entities.map((e) => serializer.serialize(e)))
        .then((promises) => Promise.all(promises));

    const body = await paginator.buildBody(items, total);
    return this.createResponse(body, 200);
  }

  async create(): Promise<Response> {
    const serializer = this.context.getSerializer();

    const payload = await this.request.getBody();
    const entity = await serializer.deserializeCreation(payload);
    await this.saveEntity(entity);

    const body = await serializer.serialize(entity);
    return this.createResponse(body, 201);
  }

  async update(): Promise<Response> {
    const serializer = this.context.getSerializer();

    const payload = await this.request.getBody();
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
    await this.context.getResource().getDatabase().persist(entity);
  }

  protected async removeEntity(entity: Entity): Promise<void> {
    await this.context.getResource().getDatabase().remove(entity);
  }

  protected createResponse(body: unknown, status: number): Response {
    const bodyStringified = body ? JSON.stringify(body) : "";
    const contentType = "application/json; charset=utf-8";
    return new Response(bodyStringified, contentType, status);
  }
}
