import { eventDispatcher } from "@deepkit/event";
import { DatabaseSession, UnitOfWorkEvent } from "@deepkit/orm";

import { User } from "./user.entity";

export class UserListener {
  @eventDispatcher.listen(DatabaseSession.onInsertPre)
  async preInsert(event: UnitOfWorkEvent<User>): Promise<void> {
    if (event.classSchema.getClassType() !== User) return;
    await Promise.all(event.items.map((user) => user.hashPassword()));
  }
}
