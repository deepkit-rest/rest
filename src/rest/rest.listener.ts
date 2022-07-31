import { eventDispatcher } from "@deepkit/event";
import { onServerMainBootstrap } from "@deepkit/framework";
import { HttpRouter, httpWorkflow } from "@deepkit/http";
import { HttpAccessDeniedResponse } from "src/http-extension/http-common";

import { RestActionContext } from "./core/rest-action";
import { RestGuardLauncher } from "./core/rest-guard";
import { RestResourceRegistry } from "./core/rest-resource";

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
      // prettier-ignore
      const isRegistered = this.router
        .getRoutes()
        .some(({ action }) => action.module === module && action.type   === 'controller' && action.controller === type);
      if (isRegistered) return;
      this.router.addRouteForController(type, module);
    });
  }

  @eventDispatcher.listen(httpWorkflow.onAuth, 200)
  async afterAuth(event: typeof httpWorkflow.onAuth.event): Promise<void> {
    const context = event.injectorContext.get(RestActionContext);

    try {
      context.getActionMeta();
    } catch {
      return;
    }

    const guardTypes = [
      ...context.getResourceMeta().guards,
      ...context.getActionMeta().guards,
    ];
    const response = await this.guardLauncher.launch(
      guardTypes,
      event.injectorContext,
      context.getModule(),
    );
    if (response) {
      event.injectorContext.set(HttpAccessDeniedResponse, response);
      event.accessDenied();
    }
  }
}
