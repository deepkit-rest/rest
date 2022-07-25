import { createModule } from "@deepkit/app";

import {
  FileRecordResource,
  FileRecordSerializer,
} from "./file-system-record.resource";

export class FileModule extends createModule(
  {
    controllers: [FileRecordResource],
    providers: [{ provide: FileRecordSerializer, scope: "http" }],
  },
  "file",
) {}
