import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { ResourceCrudAdapter } from "src/resource/resource-crud-adapter.interface";

import { FileRecord } from "./file-record.entity";

export class FileRecordAdapter implements ResourceCrudAdapter<FileRecord> {
  constructor(
    private db: InjectDatabaseSession,
    private context: RequestContext,
  ) {}

  query(): orm.Query<FileRecord> {
    const query = this.db
      .query(FileRecord)
      .useInnerJoin("owner")
      .filter({ id: this.context.user.id })
      .end();
    // temporary workaround: SQL formatter fails to properly handle unpopulated
    // relations and causes validation errors at runtime
    query.model.joins = query.model.joins.filter(
      (model) => model.propertySchema.getName() !== "owner",
    );
    return query;
  }
}
