import { HttpRequest } from "@deepkit/http";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { ReceiveType } from "@deepkit/type";

import {
  RestActionMetaValidated,
  RestResourceMetaValidated,
} from "./rest.meta";

export interface RestResource<Entity> {
  query(): orm.Query<Entity>;
}

export interface RestActionHandler {
  handle(context: RestActionHandlerContext): any;
}

export interface RestActionHandlerContext {
  request: HttpRequest;
  resourceMeta: RestResourceMetaValidated;
  actionMeta: RestActionMetaValidated;
  parseBody<Model>(type?: ReceiveType<Model>): Model;
  parseQueries<Model>(type?: ReceiveType<Model>): Model;
}

export interface ResolvedRestActionHandler {
  (): Promise<any>;
}
