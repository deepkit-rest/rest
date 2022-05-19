import { http, HttpQueries } from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import * as orm from "@deepkit/orm"; // We have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release.
import { ResourceService } from "src/resource/resource.service";
import { ResourceCrud } from "src/resource/resource-crud.typings";
import { ResourceFilterMap } from "src/resource/resource-filter.typings";
import {
  ResourceList,
  ResourcePagination,
} from "src/resource/resource-listing.typings";
import { ResourceOrderMap } from "src/resource/resource-order.typings";

import { User } from "./user.entity";
import { DATABASE_SESSION } from "./user.module";

// Temporary workaround due to a bug related to @deepkit/injector, will be
// fixed in the next release.
type InjectDatabaseSession = Inject<
  orm.DatabaseSession<orm.DatabaseAdapter>,
  typeof DATABASE_SESSION
>;

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

  @http.GET(":uuid")
  async retrieve(uuid: string): Promise<User> {
    return this.res.retrieve(this.db.query(), { uuid });
  }
}

// TODO: use type decorators and extract fields using a type func
type UserOutputField = "uuid" | "name" | "email" | "createdAt";

type UserListQuery = {
  filter?: ResourceFilterMap<User, UserOutputField>;
  order?: ResourceOrderMap<User, UserOutputField>;
} & ResourcePagination;
