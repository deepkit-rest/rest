import { ClassType } from "@deepkit/core";
import { PartialRequired } from "src/common/utilities";
import { HttpMethod } from "src/http-extension/http-common";

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
  name?: string;
  entityType?: ClassType<Entity>;
  version?: number;
  lookup: string = "pk";
  actions: Record<string, RestActionMeta> = {};

  protected validateInternal(): void {
    if (!this.classType || !this.name || !this.entityType)
      throw new Error("Resource not properly decorated");
  }
}

export interface RestResourceMetaValidated<Entity = unknown>
  extends PartialRequired<
    RestResourceMeta<Entity>,
    "classType" | "name" | "entityType"
  > {}

export class RestActionMeta extends RestMeta<RestActionMetaValidated> {
  resource?: RestResourceMeta;
  name?: string;
  detailed = false;
  method?: HttpMethod;
  path?: string;
  configurators: RestMetaConfigurator<RestActionMeta>[] = [];

  protected validateInternal(): void {
    if (!this.resource || !this.name || !this.method)
      throw new Error("Action not properly decorated");
  }
}

export interface RestActionMetaValidated
  extends PartialRequired<RestActionMeta, "resource" | "name" | "method"> {}

export interface RestMetaConfigurator<Meta> {
  configure(meta: Meta): void;
}
