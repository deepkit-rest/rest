import { createModule } from "@deepkit/app";

import {
  FileSystemRecordResource,
  FileSystemRecordSerializer,
} from "./file-system-record.resource";
import {
  FileSystemTagResource,
  FileSystemTagSerializer,
} from "./file-system-tag.resource";

export class FileModule extends createModule(
  {
    controllers: [FileSystemRecordResource, FileSystemTagResource],
    providers: [
      { provide: FileSystemRecordSerializer, scope: "http" },
      { provide: FileSystemTagSerializer, scope: "http" },
    ],
  },
  "file",
) {}
