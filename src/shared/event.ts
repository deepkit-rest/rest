import { BaseEvent } from "@deepkit/event";

export abstract class Event<Derived extends Event<Derived>> extends BaseEvent {
  constructor(payload: EventPayload<Derived>) {
    super();
    Object.assign(this, payload);
  }
}

export type EventPayload<Event extends BaseEvent> = Omit<
  Event,
  keyof BaseEvent
>;
