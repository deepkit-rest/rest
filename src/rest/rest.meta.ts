import { ClassType } from "@deepkit/core";
import { HttpMethod } from "src/common/http";
import { PartialRequired } from "src/common/utilities";

import { RestResource } from "./rest-resource";

export class RestResourceMeta<Entity = unknown> {
  classType?: ClassType<RestResource<Entity>>;
  name?: string;
  entityType?: ClassType<Entity>;
  version?: number;
  lookup?: string;
  actions: Record<string, RestActionMeta> = {};
  validate(): RestResourceMetaValidated {
    if (!this.classType || !this.name || !this.entityType)
      throw new Error("Resource not properly decorated");
    return this as RestResourceMetaValidated;
  }
}

export interface RestResourceMetaValidated<Entity = unknown>
  extends PartialRequired<
    RestResourceMeta<Entity>,
    "classType" | "name" | "entityType"
  > {}

export class RestActionMeta {
  resource?: RestResourceMeta;
  name?: string;
  detailed = false;
  method?: HttpMethod;
  path?: string;
  configurators: RestMetaConfigurator<RestActionMeta>[] = [];
  validate(): RestActionMetaValidated {
    if (!this.resource || !this.name || !this.method)
      throw new Error("Action not properly decorated");
    return this as RestActionMetaValidated;
  }
}

export interface RestActionMetaValidated
  extends PartialRequired<RestActionMeta, "resource" | "name" | "method"> {}

export interface RestMetaConfigurator<Meta> {
  configure(meta: Meta): void;
}
