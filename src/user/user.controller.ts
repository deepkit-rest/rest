import { http, HttpQueries } from "@deepkit/http";
import { AppDatabase } from "src/database/database.service";
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
  private query = this.database.query(User);

  constructor(
    private database: AppDatabase,
    private res: ResourceService<User>,
  ) {}

  @http.GET()
  async list(
    // HttpQueries and HttpQuery cannot exist at the same time, so this might be the best solution
    { filter, order, ...pagination }: HttpQueries<UserListQuery>,
  ): Promise<ResourceList<User>> {
    return this.res.list(this.query, pagination, filter, order);
  }

  @http.GET(":uuid")
  async retrieve(uuid: string): Promise<User> {
    return this.res.retrieve(this.query, { uuid });
  }
}

type UserListQuery = {
  filter?: ResourceFilterMap<User>;
  order?: ResourceOrderMap<User>;
} & ResourcePagination;
