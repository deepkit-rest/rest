import { createModule } from "@deepkit/app";
import { HttpRangeParser } from "src/common/http-range-parser.service";
import { ResourceModule } from "src/rest-crud/resource.module";

import { FileController } from "./file.controller";
import { FileRecordAdapter } from "./file-record.adapter";
import { FileRecord } from "./file-record.entity";

// this module is currently a draft because it's hard to test it due to some
// bugs of the framework

export class FileModule extends createModule(
  {
    controllers: [FileController],
    providers: [HttpRangeParser],
  },
  "file",
) {
  override imports = [
    new ResourceModule<FileRecord>().withAdapter(FileRecordAdapter),
  ];
}
