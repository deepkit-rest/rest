import { http, HttpBody } from "@deepkit/http";
import { Query } from "@deepkit/orm";
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { NoContentResponse } from "src/http-extension/http-common";
import { rest } from "src/rest/core/rest-decoration";
import { RestResource } from "src/rest/core/rest-resource";
import { RestCrudService, RestList } from "src/rest/crud/rest-crud";
import {
  RestFilteringCustomizations,
  RestGenericFilter,
} from "src/rest/crud/rest-filtering";
import {
  RestOffsetLimitPaginator,
  RestPaginationCustomizations,
} from "src/rest/crud/rest-pagination";
import {
  RestGenericSorter,
  RestSortingCustomizations,
} from "src/rest/crud/rest-sorting";
import { User } from "src/user/user.entity";

import { Tag } from "./tag.entity";

@rest.resource(Tag).lookup("id")
export class TagResource
  implements
    RestResource<Tag>,
    RestPaginationCustomizations,
    RestFilteringCustomizations,
    RestSortingCustomizations
{
  readonly paginator = RestOffsetLimitPaginator;
  readonly filters = [RestGenericFilter];
  readonly sorters = [RestGenericSorter];

  constructor(
    private context: RequestContext,
    private database: InjectDatabaseSession,
    private crud: RestCrudService,
  ) {}

  query(): Query<Tag> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.database.query(Tag).filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(): Promise<RestList<Tag>> {
    return this.crud.list();
  }

  @rest.action("POST")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async create(payload: HttpBody<TagCreationPayload>): Promise<Tag> {
    const owner = this.database.getReference(User, this.context.user.id);
    const tag = new Tag({ ...payload, owner });
    this.database.add(tag);
    return tag;
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(): Promise<Tag> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(payload: HttpBody<TagUpdatePayload>): Promise<Tag> {
    const tag = await this.retrieve();
    return tag.assign(payload);
  }

  @rest.action("DELETE").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async delete(): Promise<NoContentResponse> {
    return this.crud.delete();
  }
}

interface TagCreationPayload {
  name: Tag["name"];
}

interface TagUpdatePayload extends Partial<TagCreationPayload> {}
