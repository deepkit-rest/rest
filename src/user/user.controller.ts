import {
  http,
  HttpAccessDeniedError,
  HttpBadRequestError,
  HttpBody,
  HttpNotFoundError,
  HttpQueries,
} from "@deepkit/http";
import { InlineRuntimeType, Maximum } from "@deepkit/type";
import { NoContentResponse } from "src/common/http";
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { ResourceCrudHandler } from "src/resource/resource-crud-handler.service";
import { ResourceFilterMapFactory } from "src/resource/resource-filter-map-factory";
import {
  ResourceList,
  ResourcePagination,
} from "src/resource/resource-listing.typings";
import { ResourceOrderMap } from "src/resource/resource-order.typings";

import { User } from "./user.entity";
import { UserVerificationService } from "./user-verification.service";

@http.controller("users")
export class UserController {
  constructor(
    private context: RequestContext,
    private database: InjectDatabaseSession,
    private crudHandler: ResourceCrudHandler<User>,
    private verificationService: UserVerificationService,
  ) {}

  @http
    .GET()
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async list({
    limit = 30,
    offset = 0,
    filter,
    order,
  }: HttpQueries<UserListQuery>): Promise<ResourceList<User>> {
    return this.crudHandler.list({
      pagination: { limit, offset },
      filter,
      order,
    });
  }

  @http
    .GET("me")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async retrieveMe(): Promise<User> {
    return this.crudHandler.retrieve({ id: this.context.user.id });
  }

  @http
    .GET(":id")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async retrieve(id: string): Promise<User> {
    return this.crudHandler.retrieve({ id });
  }

  @http
    .PATCH("me")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async updateMe(
    payload: HttpBody<Partial<Pick<User, "name" | "email" | "password">>>,
  ): Promise<User> {
    const user = await this.crudHandler.retrieve({ id: this.context.user.id });
    user.assign(payload);
    return user;
  }

  @http
    .PUT("me/verification")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
    .response(204, "Verification requested")
    .response(403, "Duplicate verification request")
  async requestVerification(): Promise<NoContentResponse> {
    try {
      this.verificationService.request(this.context.user.id);
    } catch (error) {
      throw new HttpAccessDeniedError("Duplicate verification request");
    }
    return new NoContentResponse();
  }

  @http
    .GET("me/verification")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
    .response(204, "Pending verification exists")
    .response(404, "No pending verification")
  async inspectVerification(): Promise<NoContentResponse> {
    if (!this.verificationService.exists(this.context.user.id))
      throw new HttpNotFoundError("No pending verification");
    return new NoContentResponse();
  }

  @http
    .PUT("me/verification/confirmation")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
    .response(204, "Verified")
    .response(400, "Code not match")
    .response(404, "No pending verification")
  async confirmVerification(
    { code }: HttpBody<{ code: string }>, //
  ): Promise<NoContentResponse> {
    const user = await this.database
      .query(User)
      .filter({ id: this.context.user.id })
      .findOne();
    if (!this.verificationService.exists(this.context.user.id))
      throw new HttpNotFoundError("No pending verification");
    const verified = this.verificationService.confirm(user.id, code);
    if (!verified) throw new HttpBadRequestError("Code not match");
    user.verifiedAt = new Date();
    return new NoContentResponse();
  }
}

const models = {
  filter: ResourceFilterMapFactory.build<User>(
    ["id", "name", "email", "createdAt"], //
  ),
};

interface UserListQuery {
  limit?: ResourcePagination["limit"] & Maximum<500>;
  offset?: ResourcePagination["offset"] & Maximum<500>;
  filter?: InlineRuntimeType<typeof models.filter>;
  order?: ResourceOrderMap<User, "id" | "name" | "email" | "createdAt">;
}
