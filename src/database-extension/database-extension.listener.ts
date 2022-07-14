import { eventDispatcher } from "@deepkit/event";
import { onServerBootstrap } from "@deepkit/framework";
import { httpWorkflow } from "@deepkit/http";
import { DatabaseSession } from "@deepkit/orm";

import { DatabaseInitializer } from "./database-initializer.service";

export class DatabaseListener {
  constructor(private databaseInitializer: DatabaseInitializer) {}

  @eventDispatcher.listen(onServerBootstrap)
  async onServerBootstrap(): Promise<void> {
    await this.databaseInitializer.initialize();
  }

  @eventDispatcher.listen(httpWorkflow.onController, 1000)
  async afterHttpController(
    event: typeof httpWorkflow.onController.event,
  ): Promise<void> {
    const session = event.injectorContext.get(DatabaseSession);
    await session.commit();
  }
}
