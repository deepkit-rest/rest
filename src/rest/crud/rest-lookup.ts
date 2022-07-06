import { ClassType } from "@deepkit/core";
import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release
import { Type } from "@deepkit/type";
import { purify } from "src/common/type";

import {
  RestActionContext,
  RestActionContextReader,
} from "../core/rest-action";

export interface RestLookupCustomizations {
  lookupBackend?: ClassType<RestLookupBackend>;
}

export interface RestLookupBackend {
  lookup<Entity>(
    context: RestActionContext,
    query: orm.Query<Entity>,
  ): orm.Query<Entity>;
}

export class RestFieldLookupBackend implements RestLookupBackend {
  constructor(protected contextReader: RestActionContextReader) {}

  lookup<Entity>(
    context: RestActionContext<Entity>,
    query: orm.Query<Entity>,
  ): orm.Query<Entity> {
    const [name, valueRaw, type] = this.contextReader.getLookupInfo(context);
    const value = this.transformValue(valueRaw, type);
    return query.addFilter(name, value as any);
  }

  protected transformValue(raw: unknown, type: Type): unknown {
    return purify(raw, type);
  }
}
