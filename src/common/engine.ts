import {
  deserialize,
  InlineRuntimeType,
  ReflectionClass,
  TypeClass,
  validate,
  ValidationError,
} from "@deepkit/type";

export interface Engine<Options extends object> {
  options: Options;
  bootstrap(): Promise<void>;
}

export interface EngineClass<Options extends object> {
  new (options: Options): Engine<Options>;
}

export interface EngineRegistryPlain {
  [name: string]: EngineClass<any>;
}

export class EngineRegistry extends Map<string, EngineClass<any>> {}

export class EngineManager {
  protected registry = new EngineRegistry();

  register(name: string, engine: EngineClass<any>): void {
    this.registry.set(name, engine);
  }

  registerAll(registry: EngineRegistryPlain): void {
    Object.entries(registry).forEach(([name, engine]) => {
      this.register(name, engine);
    });
  }

  instantiate(name: string, optionsRaw: string): Engine<any> {
    const engineClass = this.registry.get(name);
    if (!engineClass) throw new Error(`Engine ${name} not found`);

    const optionsType = this.getOptionsType(engineClass);
    if (!optionsType) throw new Error(`Engine ${name} have no options type`);
    type Options = InlineRuntimeType<typeof optionsType>;

    let options: Options;
    try {
      options = deserialize<Options>(JSON.parse(optionsRaw));
      const errors = validate<Options>(options);
      if (errors.length) throw new ValidationError(errors);
    } catch (error) {
      throw new Error(`Engine ${name} options invalid: ${error}`);
    }

    return new engineClass(options);
  }

  private getOptionsType(classType: EngineClass<any>) {
    const schema = ReflectionClass.from(classType);
    const type = schema.type as TypeClass;
    return type.extendsArguments?.[0];
  }
}
