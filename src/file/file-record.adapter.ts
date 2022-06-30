import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { RestCrudAdapter } from "src/rest-crud/rest-crud-crud-adapter.interface";
import { User } from "src/user/user.entity";

import { FileRecord } from "./file-record.entity";

export class FileRecordAdapter implements RestCrudAdapter<FileRecord> {
  constructor(
    private db: InjectDatabaseSession,
    private context: RequestContext,
  ) {}

  query(): orm.Query<FileRecord> {
    const query = this.db
      .query(FileRecord)
      .filter({ owner: this.db.getReference(User, this.context.user.id) });
    return query;
  }
}
