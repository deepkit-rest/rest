import { createModule } from "@deepkit/app";

import { RestCrudFilterMapFactory } from "./models/rest-crud-filter-map-factory";
import { RestCrudOrderMapFactory } from "./models/rest-crud-order-map-factory";
import { RestCrudService } from "./rest-crud.service";

export class RestCrudModule extends createModule({
  providers: [
    RestCrudService,
    RestCrudFilterMapFactory,
    RestCrudOrderMapFactory,
  ],
  exports: [RestCrudService, RestCrudFilterMapFactory, RestCrudOrderMapFactory],
}) {}
