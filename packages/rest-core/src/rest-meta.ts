import { ClassType } from "@deepkit/core";
import { PartialRequired } from "@deepkit-rest/common";
import { HttpMethod } from "@deepkit-rest/http-extension";

import { RestGuard } from "./rest-guard";
import { RestResource } from "./rest-resource";

abstract class RestMeta<Validated extends RestMeta<Validated>> {
  protected validated = false;
  validate(): Validated {
    if (!this.validated) {
      this.validated = true;
      this.validateInternal();
    }
    return this as unknown as Validated;
  }
  protected abstract validateInternal(): void;
}

export class RestResourceMeta<
  Entity = unknown,
> extends RestMeta<RestResourceMetaValidated> {
  classType?: ClassType<RestResource<Entity>>;
  path?: string;
  entityType?: ClassType<Entity>;
  actions: Record<string, RestActionMeta> = {};
  guards: ClassType<RestGuard>[] = [];

  protected validateInternal(): void {
    if (!this.classType || !this.path || !this.entityType)
      throw new Error("Resource not properly decorated");
  }
}

export interface RestResourceMetaValidated<Entity = unknown>
  extends PartialRequired<
    RestResourceMeta<Entity>,
    "classType" | "path" | "entityType"
  > {}

export class RestActionMeta extends RestMeta<RestActionMetaValidated> {
  resource?: RestResourceMeta;
  name?: string;
  method?: HttpMethod;
  path?: string;
  guards: ClassType<RestGuard>[] = [];

  protected validateInternal(): void {
    if (!this.resource || !this.name || !this.method)
      throw new Error("Action not properly decorated");
  }
}

export interface RestActionMetaValidated
  extends PartialRequired<RestActionMeta, "resource" | "name" | "method"> {}
