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
import { RestResourceInstaller, RestResourceRegistry } from "./rest-resource";

export class RestListener {
  constructor(
    private resourceRegistry: RestResourceRegistry,
    private guardLauncher: RestGuardLauncher,
    private resourceInstaller: RestResourceInstaller,
    private router: HttpRouter,
  ) {}

  @eventDispatcher.listen(onServerMainBootstrap)
  beforeServerMainBootstrap(): void {
    this.resourceInstaller.registerAll(this.resourceRegistry, this.router);
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
