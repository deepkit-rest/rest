import { RestActionContext } from "../core/rest-action";
import { RestList } from "../crud-models/rest-list";
import { RestListService } from "./rest-list";
import { RestRetrieveService } from "./rest-retrieve";

export class RestCrudService
  implements
    Pick<RestListService, "list">,
    Pick<RestRetrieveService, "retrieve">
{
  constructor(
    private listService: RestListService,
    private retrieveService: RestRetrieveService,
  ) {}

  list<Entity>(context: RestActionContext<Entity>): Promise<RestList<Entity>> {
    return this.listService.list(context);
  }

  retrieve<Entity>(context: RestActionContext<Entity>): Promise<Entity> {
    return this.retrieveService.retrieve(context);
  }
}
