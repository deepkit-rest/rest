import { eventDispatcher } from "@deepkit/event";
import { httpWorkflow } from "@deepkit/http";
import { DatabaseSession } from "@deepkit/orm";

import { DATABASE_SESSION } from "./database.module";

export class DatabaseListener {
  @eventDispatcher.listen(httpWorkflow.onController, 1000)
  async afterHttpController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    const session =
      event.injectorContext.get<DatabaseSession<any>>(DATABASE_SESSION);
    await session.commit();
  }
}
