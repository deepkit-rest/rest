import { createTransport } from "nodemailer";

import {
  Email,
  EmailEngine,
  EmailEngineOptions,
  EmailParticipant,
} from "../email-engine.interface";

export class NodemailerEmailEngine
  implements EmailEngine<NodemailerEmailEngineOptions>
{
  private transporter = createTransport(this.options.transport);

  constructor(public options: NodemailerEmailEngineOptions) {}

  async bootstrap(): Promise<void> {}

  async send(email: Email): Promise<void> {
    await this.transporter.sendMail({
      subject: email.subject,
      to: email.recipients.map(stringifyParticipant),
      from: stringifyParticipant(this.options.sender),
      text: email.content,
      html: email.contentInHtml,
    });
  }
}

export interface NodemailerEmailEngineOptions extends EmailEngineOptions {
  transport: string;
}

function stringifyParticipant({ name, address }: EmailParticipant): string {
  return name ? `"${name}" <${address}>` : address;
}
