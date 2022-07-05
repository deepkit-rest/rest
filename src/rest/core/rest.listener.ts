import { eventDispatcher } from "@deepkit/event";
import { onServerMainBootstrap } from "@deepkit/framework";
import { Router } from "@deepkit/http";

import { RestResourceRegistry } from "./rest-resource";

export class RestListener {
  constructor(private registry: RestResourceRegistry, private router: Router) {}

  @eventDispatcher.listen(onServerMainBootstrap)
  onServerMainBootstrap(): void {
    this.registry.forEach(({ type, module }) => {
      // resources that are decorated with `@http` has already been added to
      // the http controller registry of `HttpModule`
      // prettier-ignore
      const isRegistered = this.router
        .getRoutes()
        .some(({ action }) => action.module === module && action.controller === type);
      if (isRegistered) return;
      this.router.addRouteForController(type, module);
    });
  }
}
