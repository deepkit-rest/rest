import { eventDispatcher } from "@deepkit/event";
import { httpWorkflow } from "@deepkit/http";
import { RestGuardLauncher } from "src/rest/core/rest-guard";

import { AuthGuard } from "./auth.guard";

export class AuthListener {
  constructor(private guardLauncher: RestGuardLauncher) {}

  @eventDispatcher.listen(httpWorkflow.onController)
  async beforeController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    if (event.route.groups.includes("auth-required")) {
      const response = await this.guardLauncher.launch(
        [AuthGuard],
        event.injectorContext,
        event.route.action.module,
      );
      if (response) event.send(response);
    }
  }
}
