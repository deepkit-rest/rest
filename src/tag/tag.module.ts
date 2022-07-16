import { createModule } from "@deepkit/app";

import { TagResource, TagSerializer } from "./tag.resource";

export class TagModule extends createModule(
  {
    controllers: [TagResource],
    providers: [{ provide: TagSerializer, scope: "http" }],
  },
  "tag",
) {}
