import {
  HtmlResponse,
  HttpError,
  HttpRequest,
  httpWorkflow,
  RouteConfig,
} from "@deepkit/http";
import { InjectorContext } from "@deepkit/injector";

export interface Guard {
  guard(context: GuardContext): Promise<void>;
}

export interface GuardContext {
  route: RouteConfig;
  request: HttpRequest;
  injector: InjectorContext;
}

export async function useGuard(
  event: typeof httpWorkflow.onController.event,
  guard: Guard,
): Promise<void> {
  try {
    await guard.guard({
      route: event.route,
      request: event.request,
      injector: event.injectorContext,
    });
  } catch (error) {
    if (error instanceof HttpError)
      event.send(new HtmlResponse(error.message, error.httpCode));
  }
}
