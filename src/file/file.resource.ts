import {
  http,
  HttpBody,
  HttpNotFoundError,
  HttpRequest,
  HttpResponse,
} from "@deepkit/http";
import { Query } from "@deepkit/orm";
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { FileEngine } from "src/file-engine/file-engine.interface";
import {
  HttpRangeNotSatisfiableError,
  NoContentResponse,
} from "src/http-extension/http-common";
import { HttpRangeParser } from "src/http-extension/http-range-parser.service";
import { rest } from "src/rest/core/rest-decoration";
import { RestResource } from "src/rest/core/rest-resource";
import { RestCrudService, RestList } from "src/rest/crud/rest-crud";
import {
  RestFilteringCustomizations,
  RestGenericFilter,
} from "src/rest/crud/rest-filtering";
import {
  RestOffsetLimitPaginator,
  RestPaginationCustomizations,
} from "src/rest/crud/rest-pagination";
import {
  RestGenericSorter,
  RestSortingCustomizations,
} from "src/rest/crud/rest-sorting";
import { User } from "src/user/user.entity";

import { FileRecord } from "./file-record.entity";
import { FileStreamUtils } from "./file-stream.utils";

@rest.resource(FileRecord, "files").lookup("id")
export class FileResource
  implements
    RestResource<FileRecord>,
    RestPaginationCustomizations,
    RestFilteringCustomizations,
    RestSortingCustomizations
{
  readonly paginator = RestOffsetLimitPaginator;
  readonly filters = [RestGenericFilter];
  readonly sorters = [RestGenericSorter];

  constructor(
    private database: InjectDatabaseSession,
    private context: RequestContext,
    private crud: RestCrudService,
    private engine: FileEngine,
    private rangeParser: HttpRangeParser,
  ) {}

  query(): Query<FileRecord> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.database.query(FileRecord).filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(): Promise<RestList<FileRecord>> {
    return this.crud.list();
  }

  @rest.action("POST")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async create(
    payload: HttpBody<FileRecordCreationPayload>,
  ): Promise<FileRecord> {
    const owner = this.database.getReference(User, this.context.user.id);
    const record = new FileRecord({ owner, ...payload });
    this.database.add(record);
    return record;
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(): Promise<FileRecord> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(
    payload: HttpBody<FileRecordUpdatePayload>,
  ): Promise<FileRecord> {
    const record = await this.retrieve();
    return record.assign(payload);
  }

  @rest.action("DELETE").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async delete(): Promise<NoContentResponse> {
    const record = await this.retrieve();
    this.database.remove(record);
    return new NoContentResponse();
  }

  @rest.action("PUT").detailed().path("content")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async upload(request: HttpRequest): Promise<NoContentResponse> {
    const record = await this.retrieve();
    const size = getContentLength(request);
    const [key, integrity] = await Promise.all([
      this.engine.store(request),
      FileStreamUtils.hash(request),
    ]);
    record.contentKey = key;
    record.contentIntegrity = integrity;
    record.contentSize = size;
    return new NoContentResponse();
  }

  @rest.action("GET").detailed().path("content")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async download(
    response: HttpResponse,
    request: HttpRequest,
  ): Promise<HttpResponse> {
    const record = await this.retrieve();
    if (!record.isContentDefined()) throw new HttpNotFoundError();

    if (!request.headers["range"]) {
      const stream = await this.engine.retrieve(record.contentKey);
      return stream.pipe(response);
    }

    const rangesRaw = request.headers["range"];
    const { contentKey, contentSize } = record;
    const ranges = this.rangeParser.parse(rangesRaw, contentSize);
    if (ranges.length > 1) throw new HttpRangeNotSatisfiableError();
    const [[start, end]] = ranges;
    const stream = await this.engine.retrieve(contentKey, { start, end });
    response.writeHead(206); // `.status()` would accidentally `.end()` the response, and will be removed in the future, so we call `writeHead()` here.
    return stream.pipe(response);
  }

  @rest.action("GET").detailed().path("integrity")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "File integrity verified")
    .response(404, "File broken or not uploaded")
  async verify(): Promise<NoContentResponse> {
    const record = await this.retrieve();
    if (!record.isContentDefined()) throw new HttpNotFoundError();
    const stream = await this.engine.retrieve(record.contentKey);
    const integrity = await FileStreamUtils.hash(stream);
    if (integrity !== record.contentIntegrity) throw new HttpNotFoundError();
    return new NoContentResponse();
  }
}

interface FileRecordCreationPayload {
  name: FileRecord["name"];
  path: FileRecord["path"];
}

interface FileRecordUpdatePayload extends Partial<FileRecordCreationPayload> {}

function getContentLength(request: HttpRequest): number {
  const result = request.headers["content-length"];
  if (!result) throw new Error("Content-Length header is missing");
  return +result;
}
