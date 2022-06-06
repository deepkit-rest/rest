import { createTransport } from "nodemailer";

import { MailerConfig } from "./mailer.config";

export class Mailer {
  private transporter;

  constructor({ transport, address }: MailerConfig) {
    this.transporter = createTransport(transport, { from: address });
  }

  // TODO: determine return type
  async send(options: MailerSendOptions): Promise<MailerSendResult> {
    await this.transporter.sendMail(options);
    return {};
  }
}

export interface MailerSendOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailerSendResult {}
