import { createModule } from "@deepkit/app";

import { ResourceService } from "./resource.service";

export class ResourceModule extends createModule({
  providers: [ResourceService],
  exports: [ResourceService],
}) {}
