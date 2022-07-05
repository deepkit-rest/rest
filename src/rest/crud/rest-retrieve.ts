import { HttpNotFoundError } from "@deepkit/http";
import {
  RestActionContext,
  RestActionContextReader,
} from "src/rest/core/rest-action";

import { RestResource } from "../core/rest-resource";

export class RestRetrieveService {
  constructor(private contextReader: RestActionContextReader) {}

  async retrieve<Entity>(context: RestActionContext<Entity>): Promise<Entity> {
    const { actionMeta } = context;
    const resource: RestResource<Entity> & RestRetrieveCustomizations =
      this.contextReader.getResource(context);
    if (!actionMeta.detailed) throw new Error("Not a detailed action");
    const [fieldName, fieldValueRaw] =
      this.contextReader.getLookupInfo(context);
    const fieldValue: any = resource.lookup
      ? resource.lookup(fieldValueRaw)
      : fieldValueRaw;
    const result = await resource
      .query()
      .addFilter(fieldName, fieldValue)
      .findOneOrUndefined();
    if (!result) throw new HttpNotFoundError();
    return result;
  }
}

export interface RestRetrieveCustomizations {
  lookup?(raw: unknown): unknown;
}
