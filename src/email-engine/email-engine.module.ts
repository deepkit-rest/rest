import { createModule } from "@deepkit/app";
import { EngineManager } from "src/common/engine";

import { EmailEngineConfig } from "./email-engine.config";
import { EmailEngine } from "./email-engine.interface";
import { MemoryEmailEngine } from "./implementations/memory";
import { NodemailerEmailEngine } from "./implementations/nodemailer";

export class EmailEngineModule extends createModule(
  {
    config: EmailEngineConfig,
  },
  "emailEngine",
) {
  private manager = new EngineManager();

  override process(): void {
    this.manager.register("memory", MemoryEmailEngine);
    this.manager.register("nodemailer", NodemailerEmailEngine);
    const { name, options } = this.getConfig();
    const engine = this.manager.instantiate(name, options);
    this.addProvider({ provide: EmailEngine, useValue: engine });
    this.addExport(EmailEngine);
  }
}
