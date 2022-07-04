import { createModule } from "@deepkit/app";

import { FileResource } from "./file.resource";

export class FileModule extends createModule(
  {
    controllers: [FileResource],
  },
  "file",
) {}
