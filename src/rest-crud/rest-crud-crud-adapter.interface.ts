import * as orm from "@deepkit/orm"; // We have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release.

export abstract class RestCrudAdapter<Entity> {
  abstract query(): orm.Query<Entity>;
}
