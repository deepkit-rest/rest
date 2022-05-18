import { ResourceList } from "./resource-listing.typings";

export interface ResourceCrud<Entity> {
  list(...args: unknown[]): Promise<ResourceList<Entity>>;
  create(...args: unknown[]): Promise<Entity>;
  retrieve(...args: unknown[]): Promise<Entity>;
  update(...args: unknown[]): Promise<Entity>;
  delete(...args: unknown[]): Promise<void>;
}
