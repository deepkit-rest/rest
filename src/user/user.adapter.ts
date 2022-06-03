import { Query } from "@deepkit/orm";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { ResourceCrudAdapter } from "src/resource/resource-crud-adapter.interface";

import { User } from "./user.entity";

export class UserAdapter implements ResourceCrudAdapter<User> {
  constructor(private db: InjectDatabaseSession) {}

  query(): Query<User> {
    return this.db.query(User);
  }
}
