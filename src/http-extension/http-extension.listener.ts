import { eventDispatcher } from "@deepkit/event";
import { httpWorkflow } from "@deepkit/http";

import { HttpInjectorContext } from "./http-common";

export class HttpExtensionListener {
  @eventDispatcher.listen(httpWorkflow.onRequest)
  onRequest(event: typeof httpWorkflow.onRequest.event): void {
    event.injectorContext.set(HttpInjectorContext, event.injectorContext);
  }
}
