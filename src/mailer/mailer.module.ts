import { createModule } from "@deepkit/app";

import { MailerConfig } from "./mailer.config";
import { Mailer } from "./mailer.service";

export class MailerModule extends createModule(
  {
    config: MailerConfig,
    providers: [Mailer],
    exports: [Mailer],
  },
  "mailer",
) {}
