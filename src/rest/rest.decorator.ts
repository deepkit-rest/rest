import { ClassType } from "@deepkit/core";
import {
  createClassDecoratorContext as createClassDecorator,
  createPropertyDecoratorContext as createPropertyDecorator,
  entity,
  Merge as MergedDecorator,
  mergeDecorator,
} from "@deepkit/type";
import { PrettifiedDecoratorApi } from "src/common/decorator";
import { HttpMethod } from "src/common/http";

import { RestActionHandler } from "./rest.interfaces";
import { RestActionMeta, RestResourceMeta } from "./rest.meta";

export class RestClassDecoratorApi extends PrettifiedDecoratorApi<RestResourceMeta> {
  meta = new RestResourceMeta();

  onDecorate(): void {}

  resource(entityType: ClassType<unknown>, name?: string): void {
    this.meta.entityType = entityType;
    if (!name) name = entity._fetch(entityType)?.collectionName;
    if (!name) throw new Error("Cannot determine resource name");
    this.meta.name = name;
  }

  version(version: number): void {
    this.meta.version = version;
  }

  lookup(field: string): void {
    this.meta.lookup = field;
  }

  useAction(name: string, action: RestActionMeta): void {
    this.meta.actions[name] = action;
  }
}

export const restClass = createClassDecorator(RestClassDecoratorApi);

export class RestPropertyDecoratorApi extends PrettifiedDecoratorApi<RestActionMeta> {
  meta = new RestActionMeta();

  onDecorate(type: ClassType<unknown>, property?: string): void {
    if (!property) throw Error("Not decorated on property");
    restClass.useAction(property, this.meta)(type, property);
  }

  action(method: HttpMethod): void {
    this.meta.method = method;
  }

  detailed(): void {
    this.meta.detailed = true;
  }

  path(suffixPath: string): void {
    this.meta.path = suffixPath;
  }

  useHandler(handlerType: ClassType<RestActionHandler>): void {
    this.meta.handlerType = handlerType;
  }
}

export const restProperty = createPropertyDecorator(RestPropertyDecoratorApi);

export const rest: RestDecorator = mergeDecorator(restClass, restProperty);
export type RestDecorator = MergedDecorator<
  Omit<
    typeof restClass & typeof restProperty,
    "_fetch" | "t" | "meta" | "onDecorator" | "onDecorate"
  >
>;
