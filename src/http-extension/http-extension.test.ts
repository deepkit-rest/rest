import { createTestingApp } from "@deepkit/framework";
import { http, HttpRequest } from "@deepkit/http";
import { Logger, MemoryLoggerTransport } from "@deepkit/logger";

import { HttpInjectorContext } from "./http-common";
import { HttpExtensionModule } from "./http-extension.module";

describe("Http Extension", () => {
  describe("HttpInjectionContext", () => {
    it("should work", async () => {
      let assertion!: () => void;
      @http.controller()
      class MyController {
        constructor(private injector: HttpInjectorContext) {}
        @http.GET()
        route() {
          assertion = () => {
            expect(this.injector.scope?.name).toBe("http");
          };
        }
      }
      const facade = createTestingApp({
        imports: [new HttpExtensionModule()],
        controllers: [MyController],
      });
      facade.app.get(Logger).setTransport([new MemoryLoggerTransport()]); // temporary workaround: transport setup is not working, so we have to manually set it up
      await facade.startServer();
      const response = await facade.request(HttpRequest.GET("/"));
      expect(response.statusCode).toBe(200);
      assertion();
    });
  });
});
