import { eventDispatcher } from "@deepkit/event";
import { httpWorkflow } from "@deepkit/http";

import { HttpInjectorContext, HttpRouteConfig } from "./http-common";

export class HttpExtensionListener {
  @eventDispatcher.listen(httpWorkflow.onRequest)
  beforeRequestHandled(event: typeof httpWorkflow.onRequest.event): void {
    event.injectorContext.set(HttpInjectorContext, event.injectorContext);
  }

  @eventDispatcher.listen(httpWorkflow.onRoute, 200)
  afterRouteResolved(event: typeof httpWorkflow.onRoute.event): void {
    if (!event.route) return;
    event.injectorContext.set(HttpRouteConfig, event.route);
  }
}
