import { EventToken } from "@deepkit/event";
import { Query } from "@deepkit/orm";
import { Event } from "src/shared/event";

export class ResourceFilterEvent<Entity> extends Event<
  ResourceFilterEvent<Entity>
> {
  static token = new EventToken<ResourceFilterEvent<any>>("resource:filter");
  query!: Query<Entity>;
}
