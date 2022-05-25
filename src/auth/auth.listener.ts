import { eventDispatcher } from "@deepkit/event";
import { HtmlResponse, httpWorkflow } from "@deepkit/http";
import { RequestContext } from "src/core/request-context";

import { AuthTokenService } from "./auth-token.service";

export class AuthListener {
  constructor(private tokenService: AuthTokenService) {}

  @eventDispatcher.listen(httpWorkflow.onController)
  async onController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    const deny = () => event.send(new HtmlResponse("Unauthorized", 401));

    const isProtected = event.route.groups.includes("protected");
    if (!isProtected) return;
    const authorization = event.request.headers["authorization"];
    if (!authorization) return deny();
    const match = authorization.match(/^Bearer (?<token>.*)$/u);
    const token = match?.groups?.["token"];
    if (!token) return deny();
    const payload = await this.tokenService
      .decodeAndVerify(token)
      .catch(() => null);
    if (payload?.type !== "access") return deny();

    const context = event.injectorContext.get(RequestContext);
    context.user = payload.user;
  }
}
