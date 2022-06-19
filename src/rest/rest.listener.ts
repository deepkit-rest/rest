import { eventDispatcher } from "@deepkit/event";
import { onServerMainBootstrap } from "@deepkit/framework";
import { Router } from "@deepkit/http";

import { RestResourceRegistry } from "./rest.module";
import { RestResourceManager } from "./rest-resource";

export class RestListener {
  constructor(
    private registry: RestResourceRegistry,
    private manager: RestResourceManager,
    private router: Router,
  ) {}

  @eventDispatcher.listen(onServerMainBootstrap)
  onServerMainBootstrap(): void {
    this.registry.forEach(({ type, module }) => {
      this.manager.setup(type);
      this.router.addRouteForController(type, module);
    });
  }
}
