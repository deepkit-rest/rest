import { http, HttpBody, HttpQueries, HttpRequest } from "@deepkit/http";
import { HtmlNoContentResponse } from "src/common/http";
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { FileEngine } from "src/file-engine/file-engine.interface";
import { ResourceCrudHandler } from "src/resource/resource-crud-handler.service";
import { ResourceFilterMap } from "src/resource/resource-filter.typings";
import {
  ResourceList,
  ResourcePagination,
} from "src/resource/resource-listing.typings";
import { ResourceOrderMap } from "src/resource/resource-order.typings";
import { User } from "src/user/user.entity";

import { FileRecord } from "./file-record.entity";

@http.controller("files")
export class FileController {
  constructor(
    private db: InjectDatabaseSession,
    private context: RequestContext,
    private handler: ResourceCrudHandler<FileRecord>,
    private engine: FileEngine,
  ) {}

  @http
    .GET()
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async list(
    { filter, order, ...pagination }: HttpQueries<FileRecordListParameters>, //
  ): Promise<ResourceList<FileRecord>> {
    return this.handler.list({ filter, order, pagination });
  }

  @http
    .POST()
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async create(
    payload: HttpBody<FileRecordCreationPayload>,
  ): Promise<FileRecord> {
    const owner = this.db.getReference(User, this.context.user.id);
    const record = new FileRecord({ owner, ...payload });
    this.db.add(record);
    return record;
  }

  @http
    .GET(":id")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async retrieve(id: FileRecord["id"]): Promise<FileRecord> {
    return this.handler.retrieve({ id });
  }

  @http
    .PATCH(":id")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async update(
    id: FileRecord["id"],
    payload: HttpBody<FileRecordUpdatePayload>,
  ): Promise<FileRecord> {
    const record = await this.handler.retrieve({ id });
    record.assign(payload);
    return record;
  }

  @http
    .DELETE(":id")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async delete(id: FileRecord["id"]): Promise<HtmlNoContentResponse> {
    const record = await this.handler.retrieve({ id });
    this.db.remove(record);
    return new HtmlNoContentResponse();
  }

  @http
    .PUT(":id/content")
    .serialization({ groupsExclude: ["hidden"] })
    .group("protected")
  async upload(
    id: FileRecord["id"],
    request: HttpRequest,
  ): Promise<HtmlNoContentResponse> {
    const record = await this.handler.retrieve({ id });
    const ref = await this.engine.store(request);
    record.contentRef = ref;
    return new HtmlNoContentResponse();
  }
}

type FileRecordListParameters = {
  filter?: ResourceFilterMap<FileRecord>;
  order?: ResourceOrderMap<FileRecord>;
} & ResourcePagination;

interface FileRecordCreationPayload {
  name: FileRecord["name"];
  path: FileRecord["path"];
  size: FileRecord["size"];
}

interface FileRecordUpdatePayload extends Partial<FileRecordCreationPayload> {}
