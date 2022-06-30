import { createModule } from "@deepkit/app";

import { RestCrudHandler } from "./rest-crud-handler.service";

export class RestCrudModule extends createModule({
  providers: [RestCrudHandler],
  exports: [RestCrudHandler],
}) {}
