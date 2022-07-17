import { createModule } from "@deepkit/app";

import {
  HttpActionMeta,
  HttpControllerMeta,
  HttpInjectorContext,
  HttpRouteConfig,
} from "./http-common";
import { HttpExtensionListener } from "./http-extension.listener";
import { HttpRangeParser } from "./http-range-parser.service";
import { HttpRequestParser } from "./http-request-parser.service";

export class HttpExtensionModule extends createModule(
  {
    providers: [
      { provide: HttpInjectorContext, useValue: null, scope: "http" },
      { provide: HttpRouteConfig, useValue: null, scope: "http" },
      { provide: HttpControllerMeta, useValue: null, scope: "http" },
      { provide: HttpActionMeta, useValue: null, scope: "http" },
      HttpRangeParser,
      HttpRequestParser,
    ],
    listeners: [HttpExtensionListener],
    forRoot: true,
  },
  "httpExtension",
) {}
