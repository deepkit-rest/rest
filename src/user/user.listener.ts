import { eventDispatcher } from "@deepkit/event";
import { UnitOfWorkEvent } from "@deepkit/orm";
import { DATABASE_PRE_INSERT } from "src/database/database-event";

import { User } from "./user.entity";

export class UserListener {
  @eventDispatcher.listen(DATABASE_PRE_INSERT)
  async preInsert(event: UnitOfWorkEvent<User>): Promise<void> {
    if (event.classSchema.getClassType() !== User) return;
    await Promise.all(event.items.map((user) => user.hashPassword()));
  }
}
