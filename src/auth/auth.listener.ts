import { eventDispatcher } from "@deepkit/event";
import { httpWorkflow } from "@deepkit/http";
import { RequestSession } from "src/shared/request-session";

import { AuthTokenService } from "./auth-token.service";

export class AuthListener {
  constructor(private tokenService: AuthTokenService) {}

  @eventDispatcher.listen(httpWorkflow.onController)
  async onController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    const isProtected = event.route.groups.includes("protected");
    if (!isProtected) return;
    const authorization = event.request.headers["authorization"];
    if (!authorization) return event.accessDenied();
    const match = authorization.match(/^Bearer (?<token>.*)$/u);
    const token = match?.groups?.["token"];
    if (!token) return event.accessDenied();
    const payload = await this.tokenService.decodeAndVerify(token);
    if (payload.type !== "access") return event.accessDenied();
    const session = event.injectorContext.get(RequestSession);
    session.user = payload.user;
  }
}
