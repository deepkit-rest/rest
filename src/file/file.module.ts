import { createModule } from "@deepkit/app";

import { FileRecordSerializer, FileResource } from "./file.resource";

export class FileModule extends createModule(
  {
    controllers: [FileResource],
    providers: [{ provide: FileRecordSerializer, scope: "http" }],
  },
  "file",
) {}
