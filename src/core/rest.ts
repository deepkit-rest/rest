import { Database, Query } from "@deepkit/orm";
import { RestResource } from "src/rest/core/rest-resource";
import {
  RestFilteringCustomizations,
  RestGenericFilter,
} from "src/rest/crud/rest-filtering";
import {
  RestOffsetLimitPaginator,
  RestPaginationCustomizations,
} from "src/rest/crud/rest-pagination";
import { RestGenericSerializer } from "src/rest/crud/rest-serialization";
import {
  RestGenericSorter,
  RestSortingCustomizations,
} from "src/rest/crud/rest-sorting";

import { AppEntity, isAppEntityType } from "./entity";

export abstract class AppResource<Entity extends AppEntity<Entity>>
  implements
    RestResource<Entity>,
    RestPaginationCustomizations,
    RestFilteringCustomizations,
    RestSortingCustomizations
{
  paginator = RestOffsetLimitPaginator;
  filters = [RestGenericFilter];
  sorters = [RestGenericSorter];

  constructor(protected database: Database) {}

  getDatabase(): Database {
    return this.database;
  }

  abstract getQuery(): Query<Entity>;
}

export abstract class AppEntitySerializer<
  E extends AppEntity<E>,
> extends RestGenericSerializer<E> {
  protected override createEntity(data: Partial<E>): E {
    const entityType = this.context.getEntitySchema().getClassType();
    if (!isAppEntityType(entityType)) throw new Error("Invalid entity class");
    return new entityType(data) as E;
  }

  protected override updateEntity(entity: E, data: Partial<E>): E {
    return entity.assign(data);
  }
}
