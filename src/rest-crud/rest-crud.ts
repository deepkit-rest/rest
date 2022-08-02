import { createModule } from "@deepkit/app";

import { RestCreationSchemaFactory } from "./models/rest-creation-schema";
import { RestFilterMapFactory } from "./models/rest-filter-map";
import { RestOrderMapFactory } from "./models/rest-order-map";
import { RestUpdateSchemaFactory } from "./models/rest-update-schema";
import { RestCrudActionContext, RestCrudKernel } from "./rest-crud-kernel";
import { RestGenericFilter, RestGenericSorter } from "./rest-filtering";
import {
  RestNoopPaginator,
  RestOffsetLimitPaginator,
  RestPageNumberPaginator,
} from "./rest-pagination";
import { RestSingleFieldRetriever } from "./rest-retrieving";
import { RestGenericSerializer } from "./rest-serialization";

export class RestCrudModule extends createModule(
  {
    providers: [
      { provide: RestCrudKernel, scope: "http" },
      { provide: RestCrudActionContext, scope: "http" },
      RestFilterMapFactory,
      RestOrderMapFactory,
      RestCreationSchemaFactory,
      RestUpdateSchemaFactory,
      { provide: RestNoopPaginator, scope: "http" },
      { provide: RestOffsetLimitPaginator, scope: "http" },
      { provide: RestPageNumberPaginator, scope: "http" },
      { provide: RestSingleFieldRetriever, scope: "http" },
      { provide: RestGenericFilter, scope: "http" },
      { provide: RestGenericSorter, scope: "http" },
      { provide: RestGenericSerializer, scope: "http" },
    ],
    forRoot: true,
  },
  "restCrud",
) {}
