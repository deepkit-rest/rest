import { eventDispatcher } from "@deepkit/event";
import { httpWorkflow } from "@deepkit/http";
import { DatabaseSession, UnitOfWorkEvent } from "@deepkit/orm";
import { useGuard } from "src/common/guard";

import { User } from "./user.entity";
import { UserModule } from "./user.module";
import { UserSelfOnlyGuard } from "./user-self-only.guard";

export class UserListener {
  constructor(private selfOnlyGuard: UserSelfOnlyGuard) {}

  @eventDispatcher.listen(DatabaseSession.onInsertPre)
  async preInsert(event: UnitOfWorkEvent<User>): Promise<void> {
    if (event.classSchema.getClassType() !== User) return;
    await Promise.all(event.items.map((user) => user.hashPassword()));
  }

  @eventDispatcher.listen(httpWorkflow.onController)
  async preController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    if (!(event.route.action.module instanceof UserModule)) return;
    if (!event.route.groups.includes("self-only")) return;
    useGuard(event, this.selfOnlyGuard);
  }
}
