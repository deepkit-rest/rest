import {
  http,
  HttpBody,
  HttpNotFoundError,
  HttpRequest,
  HttpResponse,
} from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { RequestContext } from "src/core/request-context";
import { InjectDatabaseSession } from "src/database/database.tokens";
import { FileEngine } from "src/file-engine/file-engine.interface";
import {
  HttpRangeNotSatisfiableError,
  NoContentResponse,
} from "src/http-extension/http-common";
import { HttpRangeParser } from "src/http-extension/http-range-parser.service";
import { rest } from "src/rest/rest.decorator";
import { RestActionContext } from "src/rest/rest-action";
import { RestCrudList } from "src/rest-crud/models/rest-crud-list";
import { RestCrudResource } from "src/rest-crud/rest-crud.interface";
import { RestCrudService } from "src/rest-crud/rest-crud.service";
import { User } from "src/user/user.entity";

import { FileRecord } from "./file-record.entity";
import { FileStreamUtils } from "./file-stream.utils";

@rest.resource(FileRecord, "files").lookup("id")
export class FileResource implements RestCrudResource<FileRecord> {
  constructor(
    private database: InjectDatabaseSession,
    private context: RequestContext,
    private crud: RestCrudService,
    private engine: FileEngine,
    private rangeParser: HttpRangeParser,
  ) {}

  query(): orm.Query<FileRecord> {
    const userRef = this.database.getReference(User, this.context.user.id);
    return this.database.query(FileRecord).filter({ owner: userRef });
  }

  @rest.action("GET")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async list(
    context: RestActionContext<FileRecord>,
  ): Promise<RestCrudList<FileRecord>> {
    return this.crud.list(context);
  }

  @rest.action("POST")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async create(
    payload: HttpBody<FileRecordCreationPayload>,
  ): Promise<FileRecord> {
    const owner = this.database.getReference(User, this.context.user.id);
    const record = new FileRecord({ owner, ...payload });
    this.database.add(record);
    // temporary workaround: serialization result is different between manually
    // instantiated entities and queried entities, so we have to retrieve it
    // again from the database
    await this.database.flush();
    this.database.identityMap.clear();
    return this.query().addFilter("id", record.id).findOne();
  }

  @rest.action("GET").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async retrieve(context: RestActionContext<FileRecord>): Promise<FileRecord> {
    return this.crud.retrieve(context);
  }

  @rest.action("PATCH").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async update(
    context: RestActionContext<FileRecord>,
    payload: HttpBody<FileRecordUpdatePayload>,
  ): Promise<FileRecord> {
    const record = await this.crud.retrieve(context);
    return record.assign(payload);
  }

  @rest.action("DELETE").detailed()
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async delete(
    context: RestActionContext<FileRecord>,
  ): Promise<NoContentResponse> {
    const record = await this.crud.retrieve(context);
    this.database.remove(record);
    return new NoContentResponse();
  }

  @rest.action("PUT").detailed().path("content")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  async upload(
    context: RestActionContext<FileRecord>,
    request: HttpRequest,
  ): Promise<NoContentResponse> {
    const record = await this.crud.retrieve(context);
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
    context: RestActionContext<FileRecord>,
    response: HttpResponse,
    request: HttpRequest,
  ): Promise<HttpResponse> {
    const record = await this.crud.retrieve(context);
    if (!record.isContentDefined()) throw new HttpNotFoundError();

    if (request.headers["range"]) {
      const ranges = this.rangeParser.parse(
        request.headers["range"],
        record.contentSize,
      );

      // TODO: implement multiple chunks downloading
      if (ranges.length !== 1) throw new HttpRangeNotSatisfiableError();

      const stream = await this.engine.retrieve(record.contentKey, {
        start: ranges[0][0],
        end: ranges[0][1],
      });
      stream.pipe(response);
      response.writeHead(206); // `.status()` would accidentally `.end()` the response, and will be removed in the future, so we call writeHead() here.
      return response;
    }
    const stream = await this.engine.retrieve(record.contentKey);
    return stream.pipe(response);
  }

  @rest.action("GET").detailed().path("integrity")
  @http.serialization({ groupsExclude: ["hidden"] }).group("auth-required")
  @http
    .response(204, "File integrity verified")
    .response(404, "File broken or not uploaded")
  async verify(
    context: RestActionContext<FileRecord>,
  ): Promise<NoContentResponse> {
    const record = await this.crud.retrieve(context);
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
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return +request.headers["content-length"]!;
}
