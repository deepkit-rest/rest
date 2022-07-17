import { eventDispatcher } from "@deepkit/event";
import { httpClass, httpWorkflow } from "@deepkit/http";

import {
  HttpActionMeta,
  HttpControllerMeta,
  HttpInjectorContext,
  HttpRouteConfig,
} from "./http-common";

export class HttpExtensionListener {
  @eventDispatcher.listen(httpWorkflow.onRequest)
  beforeRequestHandled(event: typeof httpWorkflow.onRequest.event): void {
    event.injectorContext.set(HttpInjectorContext, event.injectorContext);
  }

  @eventDispatcher.listen(httpWorkflow.onRoute, 200)
  afterRouteResolved(event: typeof httpWorkflow.onRoute.event): void {
    if (!event.route) return;
    event.injectorContext.set(HttpRouteConfig, event.route);
    if (event.route.action.type !== "controller") return;
    const controllerMeta = httpClass._fetch(event.route.action.controller);
    if (!controllerMeta) throw new Error("Cannot read controller meta");
    const actionName = event.route.action.methodName;
    const actionMeta = controllerMeta.getAction(actionName);
    event.injectorContext.set(HttpControllerMeta, controllerMeta);
    event.injectorContext.set(HttpActionMeta, actionMeta);
  }
}
