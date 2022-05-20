import { http, HttpQueries } from "@deepkit/http";
import { InjectDatabaseSession } from "src/database/database.module";
import { ResourceService } from "src/resource/resource.service";
import { ResourceCrud } from "src/resource/resource-crud.typings";
import { ResourceFilterMap } from "src/resource/resource-filter.typings";
import {
  ResourceList,
  ResourcePagination,
} from "src/resource/resource-listing.typings";
import { ResourceOrderMap } from "src/resource/resource-order.typings";

import { User } from "./user.entity";

@http.controller("users")
export class UserController implements Partial<ResourceCrud<User>> {
  constructor(
    private db: InjectDatabaseSession,
    private res: ResourceService<User>,
  ) {}

  @http.GET()
  async list(
    { filter, order, ...pagination }: HttpQueries<UserListQuery>, // HttpQueries and HttpQuery cannot exist at the same time currently, but this feature might be available in a future release.
  ): Promise<ResourceList<User>> {
    return this.res.list(this.db.query(), pagination, filter, order);
  }

  @http.GET(":id")
  async retrieve(id: string): Promise<User> {
    return this.res.retrieve(this.db.query(), { id });
  }
}

// TODO: use type decorators and extract fields using a type func
type UserOutputField = "id" | "name" | "email" | "createdAt";

type UserListQuery = {
  filter?: ResourceFilterMap<User, UserOutputField>;
  order?: ResourceOrderMap<User, UserOutputField>;
} & ResourcePagination;
