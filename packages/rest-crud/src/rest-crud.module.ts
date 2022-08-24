import { createModule } from "@deepkit/app";

import { RestGenericFilter, RestGenericSorter } from "./handlers/rest-filters";
import {
  RestNoopPaginator,
  RestOffsetLimitPaginator,
  RestPageNumberPaginator,
} from "./handlers/rest-paginators";
import { RestSingleFieldRetriever } from "./handlers/rest-retrievers";
import { RestGenericSerializer } from "./handlers/rest-serializers";
import { RestCreationSchemaFactory } from "./models/rest-creation-schema";
import { RestFilterMapFactory } from "./models/rest-filter-map";
import { RestOrderMapFactory } from "./models/rest-order-map";
import { RestUpdateSchemaFactory } from "./models/rest-update-schema";
import { RestCrudActionContext } from "./rest-crud-action-context.service";
import { RestCrudKernel } from "./rest-crud-kernel.service";

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
