import { eventDispatcher } from "@deepkit/event";
import {
  HttpRequest,
  HttpUnauthorizedError,
  httpWorkflow,
} from "@deepkit/http";
import { RequestContext } from "src/core/request-context";
import { RestGuard, RestGuardLauncher } from "src/rest/core/rest-guard";

import { AuthTokenService } from "./auth-token.service";

export class AuthGuard implements RestGuard {
  constructor(
    private request: HttpRequest,
    private tokenService: AuthTokenService,
    private requestContext: RequestContext,
  ) {}

  async guard(): Promise<void> {
    const authorization = this.request.headers["authorization"];
    if (!authorization) throw new HttpUnauthorizedError();
    const match = authorization.match(/^Bearer (?<token>.*)$/u);
    const token = match?.groups?.["token"];
    if (!token) throw new HttpUnauthorizedError();
    const payload = await this.tokenService
      .decodeAndVerify(token)
      .catch(() => null);
    if (payload?.type !== "access") throw new HttpUnauthorizedError();

    this.requestContext.user = payload.user;
  }
}

export class AuthGuardListener {
  constructor(private guardLauncher: RestGuardLauncher) {}

  @eventDispatcher.listen(httpWorkflow.onController)
  async beforeController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    if (event.route.groups.includes("auth-required")) {
      const response = await this.guardLauncher.launch(
        [AuthGuard],
        event.injectorContext,
        event.route.action.module,
      );
      if (response) event.send(response);
    }
  }
}
