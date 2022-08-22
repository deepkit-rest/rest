import { AppModule, createModule } from "@deepkit/app";
import { ClassType } from "@deepkit/core";

import {
  HttpAccessDeniedResponse,
  HttpActionMeta,
  HttpControllerMeta,
  HttpInjectorContext,
  HttpRouteConfig,
} from "./http-common";
import { HttpControllerProcessor } from "./http-controller-processor.service";
import { HttpExtensionListener } from "./http-extension.listener";
import { HttpExtensionModuleConfig } from "./http-extension.module-config";
import { HttpRequestParsed } from "./http-request-parsed.service";
import { HttpRequestParser } from "./http-request-parser.service";
import { HttpScopedCache } from "./http-scoped-cache.service";

export class HttpExtensionModule extends createModule(
  {
    config: HttpExtensionModuleConfig,
    providers: [
      { provide: HttpInjectorContext, useValue: null, scope: "http" },
      { provide: HttpRouteConfig, useValue: null, scope: "http" },
      { provide: HttpControllerMeta, useValue: null, scope: "http" },
      { provide: HttpActionMeta, useValue: null, scope: "http" },
      { provide: HttpAccessDeniedResponse, useValue: null, scope: "http" },
      HttpRequestParser,
      { provide: HttpRequestParsed, scope: "http" },
      { provide: HttpScopedCache, scope: "http" },
    ],
    listeners: [HttpExtensionListener],
    forRoot: true,
  },
  "httpExtension",
) {
  controllerProcessor = new HttpControllerProcessor(this.getConfig());

  override processController(
    module: AppModule<any, any>,
    type: ClassType<any>,
  ): void {
    this.controllerProcessor.applyBaseUrl(type);
  }
}
