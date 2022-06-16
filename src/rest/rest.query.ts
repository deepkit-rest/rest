import * as orm from "@deepkit/orm"; // temporary workaround: we have to use namespace import here as a temporary workaround, otherwise the application will not be able to bootstrap. This will be fixed in the next release

export class RestQuery<Entity> extends orm.Query<Entity> {
  /**
   * temporary workaround: implementation of an upcoming feature.
   * @see https://github.com/deepkit/deepkit-framework/pull/257
   */
  filterAppend(filter?: this["model"]["filter"]): this {
    const c = this.clone();

    if (filter && !Object.keys(filter as object).length) filter = undefined;
    if (filter instanceof this.classSchema.getClassType()) {
      const primaryKey = this.classSchema.getPrimary();
      filter = {
        [primaryKey.name]: (filter as any)[primaryKey.name],
      } as unknown as this["model"]["filter"];
    }
    if (filter && c.model.filter)
      filter = {
        $and: [filter, c.model.filter],
      } as unknown as this["model"]["filter"];

    c.model.filter = filter;
    return c;
  }
}
