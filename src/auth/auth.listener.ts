import { eventDispatcher } from "@deepkit/event";
import { httpWorkflow } from "@deepkit/http";
import { useGuard } from "src/common/guard";

import { AuthGuard } from "./auth.guard";

export class AuthListener {
  constructor(private guard: AuthGuard) {}

  @eventDispatcher.listen(httpWorkflow.onController)
  async beforeController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    await useGuard(event, this.guard);
  }
}
