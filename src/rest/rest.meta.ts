import { ClassType } from "@deepkit/core";
import { HttpMethod } from "src/common/http";
import { PartialRequired } from "src/common/utilities";

import { RestActionHandler } from "./rest.interfaces";

export class RestResourceMeta {
  name?: string;
  entityType?: ClassType<unknown>;
  version?: number;
  lookup?: string;
  actions: Record<string, RestActionMeta> = {};
  validate(): RestResourceMetaValidated {
    if (!this.name || !this.entityType)
      throw new Error("Resource not properly decorated");
    return this as RestResourceMetaValidated;
  }
}

export interface RestResourceMetaValidated
  extends PartialRequired<RestResourceMeta, "name" | "entityType"> {}

export class RestActionMeta {
  detailed = false;
  method?: HttpMethod;
  suffix?: string;
  handlerType?: ClassType<RestActionHandler>;
  validate(): RestActionMetaValidated {
    if (!this.method) throw new Error("Action not properly decorated");
    return this as RestActionMetaValidated;
  }
}

export interface RestActionMetaValidated
  extends PartialRequired<RestActionMeta, "method"> {}
