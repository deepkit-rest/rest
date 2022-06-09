import { createModule } from "@deepkit/app";
import { EngineManager, EngineRegistryPlain } from "src/common/engine";

import { FileEngineConfig } from "./file-engine.config";
import { FileEngine } from "./file-engine.interface";
import { FileEngineListener } from "./file-engine.listener";
import { LocalFileEngine } from "./implementations/local";
import { MemoryFileEngine } from "./implementations/memory";

export class FileEngineModule extends createModule(
  {
    config: FileEngineConfig,
    listeners: [FileEngineListener],
  },
  "fileEngine",
) {
  manager = new EngineManager();
  registry: EngineRegistryPlain = {};

  override process(): void {
    this.registry = {
      local: LocalFileEngine,
      memory: MemoryFileEngine,
      ...this.registry,
    };
    this.manager.registerAll(this.registry);
    const { name, options } = this.getConfig();
    const engine = this.manager.instantiate(name, options);
    this.addProvider({ provide: FileEngine, useValue: engine });
    this.addExport(FileEngine);
  }

  withRegistry(registry: EngineRegistryPlain): this {
    this.registry = registry;
    return this;
  }
}
