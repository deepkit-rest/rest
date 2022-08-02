import { createModule } from "@deepkit/app";

import {
  HttpAccessDeniedResponse,
  HttpActionMeta,
  HttpControllerMeta,
  HttpInjectorContext,
  HttpRouteConfig,
} from "./http-common";
import { HttpExtensionListener } from "./http-extension.listener";
import { HttpRequestParsed } from "./http-request-parsed.service";
import { HttpRequestParser } from "./http-request-parser.service";
import { HttpScopedCache } from "./http-scoped-cache.service";

export class HttpExtensionModule extends createModule(
  {
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
) {}
