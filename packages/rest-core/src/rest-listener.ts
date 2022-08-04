import { eventDispatcher } from "@deepkit/event";
import { onServerMainBootstrap } from "@deepkit/framework";
import { HttpRouter, httpWorkflow, RouteConfig } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import {
  HttpAccessDeniedResponse,
  HttpActionMeta,
  HttpControllerMeta,
} from "@deepkit-rest/http-extension";

import { RestGuardLauncher } from "./rest-guard";
import { RestResourceRegistry } from "./rest-resource";

export class RestListener {
  constructor(
    private registry: RestResourceRegistry,
    private guardLauncher: RestGuardLauncher,
    private router: HttpRouter,
  ) {}

  @eventDispatcher.listen(onServerMainBootstrap)
  onServerMainBootstrap(): void {
    this.registry.forEach(({ type, module }) => {
      // resources that are decorated with `@http` has already been added to
      // the http controller registry of `HttpModule`
      const isRegistered = this.router
        .getRoutes()
        .some(
          ({ action }) =>
            action.module === module &&
            action.type === "controller" &&
            action.controller === type,
        );
      if (isRegistered) return;
      this.router.addRouteForController(type, module);
    });
  }

  @eventDispatcher.listen(httpWorkflow.onAuth, 200)
  async afterAuth(event: typeof httpWorkflow.onAuth.event): Promise<void> {
    adjustRouteConfigGroupOrder(event.route, event.injectorContext);
    const response = await this.guardLauncher.launchForRoute(
      event.route,
      event.injectorContext,
    );
    if (response) {
      event.injectorContext.set(HttpAccessDeniedResponse, response);
      event.accessDenied();
    }
  }
}

function adjustRouteConfigGroupOrder(
  routeConfig: RouteConfig,
  injectorContext: InjectorContext,
) {
  if (routeConfig.action.type === "function") return;
  const controllerMeta = injectorContext.get(HttpControllerMeta);
  const actionMeta = injectorContext.get(HttpActionMeta);
  routeConfig.groups = [
    ...controllerMeta.groups,
    ...actionMeta.groups.filter((g) => !controllerMeta.groups.includes(g)),
  ];
}
