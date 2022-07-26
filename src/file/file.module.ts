import { createModule } from "@deepkit/app";

import {
  FileSystemRecordResource,
  FileSystemRecordSerializer,
} from "./file-system-record.resource";
import { FileSystemRecordBrowser } from "./file-system-record-browser.service";
import {
  FileSystemTagResource,
  FileSystemTagSerializer,
} from "./file-system-tag.resource";

export class FileModule extends createModule(
  {
    controllers: [FileSystemRecordResource, FileSystemTagResource],
    providers: [
      FileSystemRecordBrowser,
      { provide: FileSystemRecordSerializer, scope: "http" },
      { provide: FileSystemTagSerializer, scope: "http" },
    ],
  },
  "file",
) {}
