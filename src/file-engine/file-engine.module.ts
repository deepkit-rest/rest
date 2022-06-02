import { createModule } from "@deepkit/app";

import { FileEngineConfig } from "./file-engine.config";
import { FileEngine, FileEngineClass } from "./file-engine.interface";
import { FileEngineListener } from "./file-engine.listener";
import { LocalFileEngine } from "./implementations/local";

export class FileEngineModule extends createModule(
  {
    config: FileEngineConfig,
    listeners: [FileEngineListener],
  },
  "fileEngine",
) {
  manager = new FileEngineManager();
  registry: FileEngineRegistry = {};

  override process(): void {
    this.registry = { local: LocalFileEngine, ...this.registry };
    Object.entries(this.registry).forEach(([name, engine]) => {
      this.manager.register(name, engine);
    });
    const config = this.getConfig();
    const engine = this.manager.instantiate(config.name);
    this.addProvider({ provide: FileEngine, useValue: engine });
    this.addExport(FileEngine);
  }

  withRegistry(registry: FileEngineRegistry): this {
    this.registry = registry;
    return this;
  }
}

export class FileEngineManager {
  protected registry = new Map<string, FileEngineClass>();

  register(name: string, engine: FileEngineClass): void {
    this.registry.set(name, engine);
  }

  instantiate(name: string): FileEngine {
    const engine = this.registry.get(name);
    if (!engine) throw new Error(`File engine ${name} not found`);
    const instance = new engine();
    return instance;
  }
}

export interface FileEngineRegistry {
  [name: string]: FileEngineClass;
}
