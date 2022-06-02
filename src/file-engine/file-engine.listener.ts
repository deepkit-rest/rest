import { eventDispatcher } from "@deepkit/event";
import { onServerMainBootstrap } from "@deepkit/framework";

import { FileEngineConfig } from "./file-engine.config";
import { FileEngine } from "./file-engine.interface";

export class FileEngineListener {
  constructor(
    private engine: FileEngine,
    private options: FileEngineConfig["options"],
  ) {}

  @eventDispatcher.listen(onServerMainBootstrap)
  async onServerMainBootstrap(): Promise<void> {
    await this.engine.bootstrap(JSON.parse(this.options));
  }
}
