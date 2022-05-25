import { EventDispatcher, EventToken } from "@deepkit/event";
import { UnitOfWorkEvent } from "@deepkit/orm";

import { AppDatabase } from "./database.provider";

export function forwardDatabaseEvents(
  database: AppDatabase,
  dispatcher: EventDispatcher,
): void {
  database.unitOfWorkEvents.onInsertPre.subscribe(async (event) =>
    dispatcher.dispatch(
      DATABASE_PRE_INSERT,
      DatabaseUnitOfWorkEvent.from(event),
    ),
  );
}

export const DATABASE_PRE_INSERT = new EventToken<
  DatabaseUnitOfWorkEvent<unknown>
>("database:pre-insert");

// @deepkit/orm is built before @deepkit/event, so there are some differences
// between their interfaces. Database events will migrate to @deepkit/event
// in a future release.
class DatabaseUnitOfWorkEvent<Entity> extends UnitOfWorkEvent<Entity> {
  static from<Entity>(origin: UnitOfWorkEvent<Entity>) {
    const { classSchema, databaseSession, items } = origin;
    return new this(classSchema, databaseSession, items);
  }
  isStopped() {
    return this.stopped;
  }
}
