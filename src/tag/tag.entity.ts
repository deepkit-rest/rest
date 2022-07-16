import { BackReference, entity, Group, Reference } from "@deepkit/type";
import { FileRecordToTag } from "src/core/entities";
import { Entity } from "src/core/entity";
import { FileRecord } from "src/file/file-record.entity";
import { Filterable } from "src/rest/crud-models/rest-filter-map";
import { Orderable } from "src/rest/crud-models/rest-order-map";
import { User } from "src/user/user.entity";

type BackRefViaPivot = BackReference<{ via: typeof FileRecordToTag }>;

@entity.name("tag").collection("tags")
export class Tag extends Entity<Tag, "owner" | "name"> {
  owner!: User & Reference & Filterable & Orderable;
  name!: string & Filterable & Orderable;
  files: FileRecord[] & BackRefViaPivot & Group<"hidden"> = [];
}
