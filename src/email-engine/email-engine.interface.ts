import { Engine, EngineClass } from "src/common/engine";

export abstract class EmailEngine<
  Options extends EmailEngineOptions = EmailEngineOptions,
> implements Engine<Options>
{
  abstract options: Options;
  abstract bootstrap(): Promise<void>;
  abstract send(email: Email): Promise<void>;
}

export interface EmailEngineClass<
  Options extends EmailEngineOptions = EmailEngineOptions,
> extends EngineClass<Options> {
  new (options: Options): EmailEngine<Options>;
}

export interface EmailEngineOptions {
  sender: EmailParticipant;
}

export interface Email {
  subject: string;
  content: string;
  contentInHtml?: string;
  recipients: EmailParticipant[];
}

export interface EmailParticipant {
  name?: string;
  address: string;
}
