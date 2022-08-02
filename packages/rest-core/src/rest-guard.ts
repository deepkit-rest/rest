import { ClassType } from "@deepkit/core";
import { HtmlResponse, HttpError } from "@deepkit/http";
import { InjectorContext, InjectorModule } from "@deepkit/injector";

export interface RestGuard {
  guard(): Promise<void>;
}

export class RestGuardLauncher {
  async launch(
    guardTypes: ClassType<RestGuard>[],
    injectorContext: InjectorContext,
    routeModule?: InjectorModule,
  ): Promise<HtmlResponse | null> {
    for (const guardType of guardTypes) {
      const guard = injectorContext.resolve(routeModule, guardType)();
      try {
        await guard.guard();
      } catch (error) {
        if (error instanceof HttpError)
          return new HtmlResponse(error.message, error.httpCode);
        throw error;
      }
    }
    return null;
  }
}
