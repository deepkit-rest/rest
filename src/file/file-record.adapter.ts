import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap
import { RequestContext } from "src/core/request-context";
import { ResourceAdapter } from "src/resource/resource.adapter";

import { FileRecord } from "./file-record.entity";

export class FileRecordAdapter implements ResourceAdapter<FileRecord> {
  constructor(private context: RequestContext) {}

  filter(query: orm.Query<FileRecord>): orm.Query<FileRecord> {
    return query
      .useInnerJoin("owner")
      .filter({ id: this.context.user.id })
      .end();
  }
}
