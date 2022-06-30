import { createModule } from "@deepkit/app";

import { FileController } from "./file.controller";
import { FileRecordAdapter } from "./file-record.adapter";
import { FileRecord } from "./file-record.entity";

// this module is currently a draft because it's hard to test it due to some
// bugs of the framework

export class FileModule extends createModule(
  {
    controllers: [FileController],
  },
  "file",
) {
  override imports = [
    new ResourceModule<FileRecord>().withAdapter(FileRecordAdapter),
  ];
}
