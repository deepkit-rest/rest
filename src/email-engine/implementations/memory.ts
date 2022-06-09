import {
  Email,
  EmailEngine,
  EmailEngineOptions,
} from "../email-engine.interface";

export class MemoryEmailEngine implements EmailEngine<EmailEngineOptions> {
  inbox: Email[] = [];

  constructor(public options: EmailEngineOptions) {}

  async bootstrap(): Promise<void> {}

  async send(email: Email): Promise<void> {
    this.inbox.push(email);
  }
}
