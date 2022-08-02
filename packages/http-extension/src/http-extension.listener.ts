import { eventDispatcher } from "@deepkit/event";
import { httpClass, httpWorkflow } from "@deepkit/http";

import {
  HttpAccessDeniedResponse,
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
    const controllerType = event.route.action.controller;
    const controllerMeta = httpClass._fetch(controllerType);
    const controllerIsInternal =
      controllerType.name === "HttpRequestStaticServingListener"; // don't know what it is
    if (controllerIsInternal) return;
    if (!controllerMeta) throw new Error("Cannot read controller meta");
    const actionName = event.route.action.methodName;
    const actionMeta = controllerMeta.getAction(actionName);
    event.injectorContext.set(HttpControllerMeta, controllerMeta);
    event.injectorContext.set(HttpActionMeta, actionMeta);
  }

  @eventDispatcher.listen(httpWorkflow.onAccessDenied)
  onAccessDenied(event: typeof httpWorkflow.onAccessDenied.event): void {
    const response = event.injectorContext.get(HttpAccessDeniedResponse);
    if (response) event.send(response);
  }
}
