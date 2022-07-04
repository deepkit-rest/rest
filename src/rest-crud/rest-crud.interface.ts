import { RestResource } from "src/rest/rest-resource";

export interface RestCrudResource<Entity> extends RestResource<Entity> {
  resolveLookup?(raw: unknown): unknown;
}
