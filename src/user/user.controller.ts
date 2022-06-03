import { http, HttpBody, HttpQueries } from "@deepkit/http";
import { RequestContext } from "src/core/request-context";
import { ResourceCrudHandler } from "src/resource/resource-crud-handler.service";
import { ResourceFilterMap } from "src/resource/resource-filter.typings";
import {
  ResourceList,
  ResourcePagination,
} from "src/resource/resource-listing.typings";
import { ResourceOrderMap } from "src/resource/resource-order.typings";

import { User } from "./user.entity";

@http.controller("users")
export class UserController {
  constructor(
    private context: RequestContext,
    private handler: ResourceCrudHandler<User>,
  ) {}

  @http
    .GET()
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async list(
    { filter, order, ...pagination }: HttpQueries<UserListQuery>, // HttpQueries and HttpQuery cannot exist at the same time currently, but this feature might be available in a future release.
  ): Promise<ResourceList<User>> {
    return this.handler.list({ pagination, filter, order });
  }

  @http
    .GET("me")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async retrieveMe(): Promise<User> {
    return this.handler.retrieve({ id: this.context.user.id });
  }

  @http
    .GET(":id")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async retrieve(id: string): Promise<User> {
    return this.handler.retrieve({ id });
  }

  @http
    .PATCH("me")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async updateMe(
    payload: HttpBody<Partial<Pick<User, "name" | "email" | "password">>>,
  ): Promise<User> {
    const user = await this.handler.retrieve({ id: this.context.user.id });
    user.assign(payload);
    return user;
  }
}

type UserOutputField = "id" | "name" | "email" | "createdAt";

type UserListQuery = {
  filter?: ResourceFilterMap<User, UserOutputField>;
  order?: ResourceOrderMap<User, UserOutputField>;
} & ResourcePagination;
