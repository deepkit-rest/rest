import {
  http,
  HttpNotFoundError,
  HttpRequest,
  HttpResponse,
} from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import { Query } from "@deepkit/orm";
import { RequestContext } from "src/core/request-context";
import { AppEntitySerializer, AppResource } from "src/core/rest";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { FileEngine } from "src/file-engine/file-engine.interface";
import {
  HttpRangeNotSatisfiableError,
  NoContentResponse,
} from "src/http-extension/http-common";
import { HttpRangeParser } from "src/http-extension/http-range-parser.service";
import { rest } from "src/rest/core/rest-decoration";
import {
  ResponseReturnType,
  RestCrudActionContext,
  RestCrudKernel,
} from "src/rest/crud/rest-crud";
import { RestSerializationCustomizations } from "src/rest/crud/rest-serialization";
import { User } from "src/user/user.entity";

import { FileRecord } from "./file-record.entity";
import { FileStreamUtils } from "./file-stream.utils";

@rest.resource(FileRecord, "files").lookup("id")
export class FileRecordResource
  extends AppResource<FileRecord>
  implements RestSerializationCustomizations<FileRecord>
{
  readonly serializer = FileRecordSerializer;

  constructor(
    private database: InjectDatabaseSession,
    private context: RequestContext,
    private crud: RestCrudKernel<FileRecord>,
    private crudContext: RestCrudActionContext<FileRecord>,
    private engine: FileEngine,
    private rangeParser: HttpRangeParser,
  ) {
    super();
  }

  query(): Query<FileRecord> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.database.query(FileRecord).filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(): Promise<ResponseReturnType> {
    return this.crud.list();
  }

  @rest.action("POST")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async create(): Promise<ResponseReturnType> {
    return this.crud.create();
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(): Promise<ResponseReturnType> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(): Promise<ResponseReturnType> {
    return this.crud.update();
  }

  @rest.action("DELETE").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async delete(): Promise<ResponseReturnType> {
    return this.crud.delete();
  }

  @rest.action("PUT").detailed().path("content")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async upload(request: HttpRequest): Promise<NoContentResponse> {
    const record = await this.crudContext.getEntity();
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
    const record = await this.crudContext.getEntity();
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
    const record = await this.crudContext.getEntity();
    if (!record.isContentDefined()) throw new HttpNotFoundError();
    const stream = await this.engine.retrieve(record.contentKey);
    const integrity = await FileStreamUtils.hash(stream);
    if (integrity !== record.contentIntegrity) throw new HttpNotFoundError();
    return new NoContentResponse();
  }
}

export class FileRecordSerializer extends AppEntitySerializer<FileRecord> {
  protected database!: InjectDatabaseSession;
  protected requestContext!: Inject<RequestContext>;
  protected override createEntity(data: Partial<FileRecord>): FileRecord {
    const userId = this.requestContext.user.id;
    data.owner = this.database.getReference(User, userId);
    return super.createEntity(data);
  }
}

function getContentLength(request: HttpRequest): number {
  const result = request.headers["content-length"];
  if (!result) throw new Error("Content-Length header is missing");
  return +result;
}
