import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap
import { InjectDatabaseSession } from "src/database/database.tokens";
import { ResourceCrudAdapter } from "src/resource/resource-crud-adapter.interface";

import { User } from "./user.entity";

export class UserAdapter implements ResourceCrudAdapter<User> {
  constructor(private db: InjectDatabaseSession) {}

  query(): orm.Query<User> {
    return this.db.query(User);
  }
}
