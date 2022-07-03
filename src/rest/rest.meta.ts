import { ClassType } from "@deepkit/core";
import { PartialRequired } from "src/common/utilities";
import { HttpMethod } from "src/http-extension/http-common";

import { RestResource } from "./rest-resource";

export class RestResourceMeta<Entity = unknown> {
  classType?: ClassType<RestResource<Entity>>;
  name?: string;
  entityType?: ClassType<Entity>;
  version?: number;
  lookup?: string;
  actions: Record<string, RestActionMeta> = {};

  private validated = false;

  validate(): RestResourceMetaValidated {
    if (!this.validated) {
      if (!this.classType || !this.name || !this.entityType)
        throw new Error("Resource not properly decorated");
      if (!this.lookup) {
        const actions = Object.values(this.actions);
        const hasDetailed = actions.some((meta) => meta.detailed);
        if (hasDetailed)
          throw new Error("Lookup is required for detailed actions");
      }
    }
    this.validated = true;
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

  private validated = false;

  validate(): RestActionMetaValidated {
    if (!this.validated)
      if (!this.resource || !this.name || !this.method)
        throw new Error("Action not properly decorated");
    this.validated = true;
    return this as RestActionMetaValidated;
  }
}

export interface RestActionMetaValidated
  extends PartialRequired<RestActionMeta, "resource" | "name" | "method"> {}

export interface RestMetaConfigurator<Meta> {
  configure(meta: Meta): void;
}
