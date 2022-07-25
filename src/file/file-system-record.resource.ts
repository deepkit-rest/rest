import {
  http,
  HttpNotFoundError,
  HttpRequest,
  HttpResponse,
} from "@deepkit/http";
import { Inject } from "@deepkit/injector";
import { Database, Query } from "@deepkit/orm";
import { RequestContext } from "src/core/request-context";
import { AppEntitySerializer, AppResource } from "src/core/rest";
import { InjectDatabaseSession } from "src/database-extension/database-tokens";
import { FileEngine } from "src/file-engine/file-engine.interface";
import { NoContentResponse } from "src/http-extension/http-common";
import { HttpRangeParser } from "src/http-extension/http-range-parser.service";
import { rest } from "src/rest/core/rest-decoration";
import {
  ResponseReturnType,
  RestCrudActionContext,
  RestCrudKernel,
} from "src/rest/crud/rest-crud";
import { RestSerializationCustomizations } from "src/rest/crud/rest-serialization";
import { User } from "src/user/user.entity";

import { FileStreamUtils } from "./file-stream.utils";
import { FileSystemRecord } from "./file-system-record.entity";

@rest.resource(FileSystemRecord, "files")
export class FileSystemRecordResource
  extends AppResource<FileSystemRecord>
  implements RestSerializationCustomizations<FileSystemRecord>
{
  readonly serializer = FileSystemRecordSerializer;

  constructor(
    database: Database,
    private databaseSession: InjectDatabaseSession,
    private context: RequestContext,
    private crud: RestCrudKernel<FileSystemRecord>,
    private crudContext: RestCrudActionContext<FileSystemRecord>,
    private engine: FileEngine,
    private rangeParser: HttpRangeParser,
  ) {
    super(database);
  }

  getQuery(): Query<FileSystemRecord> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.databaseSession
      .query(FileSystemRecord)
      .filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async list(): Promise<ResponseReturnType> {
    return this.crud.list();
  }

  @rest.action("POST")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async create(): Promise<ResponseReturnType> {
    return this.crud.create();
  }

  @rest.action("GET", ":pk")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async retrieve(): Promise<ResponseReturnType> {
    return this.crud.retrieve();
  }

  @rest.action("PATCH", ":pk")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async update(): Promise<ResponseReturnType> {
    return this.crud.update();
  }

  @rest.action("DELETE", ":pk")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
  async delete(): Promise<ResponseReturnType> {
    return this.crud.delete();
  }

  @rest.action("PUT", ":pk/content")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
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

  @rest.action("GET", ":pk/content")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
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
    const [start, end] = this.rangeParser.parseSingle(rangesRaw, contentSize);
    const stream = await this.engine.retrieve(contentKey, { start, end });
    response.setHeader("Content-Range", `bytes ${start}-${end}/${contentSize}`);
    response.writeHead(206); // `.status()` would accidentally `.end()` the response, and will be removed in the future, so we call `writeHead()` here.
    return stream.pipe(response);
  }

  @rest.action("GET", ":pk/integrity")
  @http.serialization({ groupsExclude: ["internal"] }).group("auth-required")
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

export class FileSystemRecordSerializer extends AppEntitySerializer<FileSystemRecord> {
  protected database!: InjectDatabaseSession;
  protected requestContext!: Inject<RequestContext>;
  protected override createEntity(
    data: Partial<FileSystemRecord>,
  ): FileSystemRecord {
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
