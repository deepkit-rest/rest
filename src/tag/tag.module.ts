import { createModule } from "@deepkit/app";

import { TagResource } from "./tag.resource";

export class TagModule extends createModule(
  {
    controllers: [TagResource],
  },
  "tag",
) {}
