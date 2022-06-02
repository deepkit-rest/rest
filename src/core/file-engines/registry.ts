import { FileEngineRegistry } from "src/file-engine/file-engine.module";

import { LocalFileEngine } from "./local.file-engine";

export const fileEngineRegistry: FileEngineRegistry = {
  local: LocalFileEngine,
};
