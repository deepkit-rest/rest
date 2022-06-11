import { BackReference, entity, Reference, uuid } from "@deepkit/type";
import { Entity } from "src/common/entity";
import { FileRecordTagPivot } from "src/core/entity-pivots";
import { FileRecord } from "src/file/file-record.entity";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";
import { User } from "src/user/user.entity";

@entity.name("tag").collection("tags")
export class Tag extends Entity<Tag, "owner" | "name"> {
  override id: Entity["id"] & Filterable & Orderable = uuid(); // temporary workaround: type info is lost during class inheritances  (https://github.com/deepkit/deepkit-framework/issues/238)
  owner!: User & Reference & Filterable & Orderable;
  name!: string & Filterable & Orderable;
  files: FileRecord[] & BackReference<{ via: typeof FileRecordTagPivot }> = [];
  override createdAt: Entity["createdAt"] & Filterable & Orderable = new Date(); // temporary workaround: type info is lost during class inheritances (https://github.com/deepkit/deepkit-framework/issues/238)
}
