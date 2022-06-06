import { createModule } from "@deepkit/app";
import {
  deserialize,
  InlineRuntimeType,
  ReflectionClass,
  TypeClass,
  validate,
  ValidationError,
} from "@deepkit/type";

import { FileEngineConfig } from "./file-engine.config";
import { FileEngine, FileEngineClass } from "./file-engine.interface";
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
  manager = new FileEngineManager();
  registry: FileEngineRegistry = {};

  override process(): void {
    this.registry = {
      local: LocalFileEngine,
      memory: MemoryFileEngine,
      ...this.registry,
    };
    Object.entries(this.registry).forEach(([name, engine]) => {
      this.manager.register(name, engine);
    });
    const { name, options } = this.getConfig();
    const engine = this.manager.instantiate(name, options);
    this.addProvider({ provide: FileEngine, useValue: engine });
    this.addExport(FileEngine);
  }

  withRegistry(registry: FileEngineRegistry): this {
    this.registry = registry;
    return this;
  }
}

class FileEngineManager {
  protected registry = new Map<string, FileEngineClass<any>>();

  register(name: string, engine: FileEngineClass<any>): void {
    this.registry.set(name, engine);
  }

  instantiate(name: string, optionsRaw: string): FileEngine {
    const engineClass = this.registry.get(name);
    if (!engineClass) throw new Error(`File engine ${name} not found`);

    const optionsType = this.getOptionsType(engineClass);
    if (!optionsType)
      throw new Error(`File engine ${name} have no options type`);
    type Options = InlineRuntimeType<typeof optionsType>;

    let options: Options;
    try {
      options = deserialize<Options>(JSON.parse(optionsRaw));
      const errors = validate<Options>(options);
      if (errors.length) throw new ValidationError(errors);
    } catch (error) {
      throw new Error(`File engine ${name} options invalid: ${error}`);
    }
    return new engineClass(options);
  }

  private getOptionsType(classType: FileEngineClass<any>) {
    const schema = ReflectionClass.from(classType);
    const type = schema.type as TypeClass;
    return type.extendsArguments?.[0];
  }
}

export interface FileEngineRegistry {
  [name: string]: FileEngineClass<any>;
}
