import { createModule } from "@deepkit/app";

import { HttpInjectorContext } from "./http-common";
import { HttpExtensionListener } from "./http-extension.listener";
import { HttpRangeParser } from "./http-range-parser.service";
import { HttpRequestParser } from "./http-request-parser.service";

export class HttpExtensionModule extends createModule(
  {
    providers: [
      { provide: HttpInjectorContext, useValue: null },
      HttpRangeParser,
      HttpRequestParser,
    ],
    listeners: [HttpExtensionListener],
    exports: [HttpInjectorContext, HttpRangeParser, HttpRequestParser],
  },
  "httpExtension",
) {}
