import { ClassType } from "@deepkit/core";
import { httpClass } from "@deepkit/http";
import { join } from "path/posix";

import { HttpExtensionModuleConfig } from "./http-extension.module-config";

export class HttpControllerProcessor {
  constructor(private config: HttpExtensionModuleConfig) {}

  applyBaseUrl(type: ClassType): void {
    if (!this.config.baseUrl) return;
    const meta = httpClass._fetch(type);
    if (!meta) return;
    meta.baseUrl = join(this.config.baseUrl, meta.baseUrl);
  }
}
