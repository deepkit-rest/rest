import { Query } from "@deepkit/orm";

export interface RestQueryProcessor {
  processQuery<Entity>(query: Query<Entity>): Query<Entity>;
}
