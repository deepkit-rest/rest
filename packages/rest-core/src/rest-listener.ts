import { eventDispatcher } from "@deepkit/event";
import { onServerMainBootstrap } from "@deepkit/framework";
import { httpWorkflow, RouteConfig } from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";
import {
  HttpAccessDeniedResponse,
  HttpActionMeta,
  HttpControllerMeta,
} from "@deepkit-rest/http-extension";

import { RestGuardLauncher } from "./rest-guard";
import { RestResourceRegistry, RestResourceRouter } from "./rest-resource";

export class RestListener {
  constructor(
    private resourceRegistry: RestResourceRegistry,
    private resourceRouter: RestResourceRouter,
    private guardLauncher: RestGuardLauncher,
  ) {}

  @eventDispatcher.listen(onServerMainBootstrap)
  beforeServerMainBootstrap(): void {
    this.resourceRegistry.forEach(({ type, module }) => {
      this.resourceRouter.register(type, module);
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
  const controllerMeta = injectorContext.get(HttpControllerMeta);
  const actionMeta = injectorContext.get(HttpActionMeta);
  if (!controllerMeta || !actionMeta) return;
  routeConfig.groups = [
    ...controllerMeta.groups,
    ...actionMeta.groups.filter((g) => !controllerMeta.groups.includes(g)),
  ];
}
