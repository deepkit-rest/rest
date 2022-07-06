import { HttpNotFoundError } from "@deepkit/http";
import { HttpInjectorContext } from "src/http-extension/http-common";
import {
  RestActionContext,
  RestActionContextReader,
} from "src/rest/core/rest-action";

import { RestResource } from "../core/rest-resource";
import {
  RestFieldLookupBackend,
  RestLookupCustomizations,
} from "./rest-lookup";

export class RestRetrieveService {
  constructor(
    private injector: HttpInjectorContext,
    private contextReader: RestActionContextReader,
  ) {}

  async retrieve<Entity>(context: RestActionContext<Entity>): Promise<Entity> {
    const { actionMeta } = context;
    if (!actionMeta.detailed) throw new Error("Not a detailed action");
    const resource: RestResource<Entity> & RestLookupCustomizations =
      this.contextReader.getResource(context);
    const lookupBackend =
      resource.lookupBackend ?? this.injector.get(RestFieldLookupBackend);
    const query = lookupBackend.lookup(context, resource.query());
    const result = await query.findOneOrUndefined();
    if (!result) throw new HttpNotFoundError();
    return result;
  }
}
