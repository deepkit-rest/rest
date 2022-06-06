import { eventDispatcher } from "@deepkit/event";
import { onServerMainBootstrap } from "@deepkit/framework";

import { FileEngine } from "./file-engine.interface";

export class FileEngineListener {
  constructor(private engine: FileEngine) {}

  @eventDispatcher.listen(onServerMainBootstrap)
  async onServerMainBootstrap(): Promise<void> {
    await this.engine.bootstrap();
  }
}
