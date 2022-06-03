import { Query } from "@deepkit/orm";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { ResourceAdapter } from "src/resource/resource.adapter";

import { User } from "./user.entity";

export class UserAdapter implements ResourceAdapter<User> {
  constructor(private db: InjectDatabaseSession) {}

  query(): Query<User> {
    return this.db.query(User);
  }
}
