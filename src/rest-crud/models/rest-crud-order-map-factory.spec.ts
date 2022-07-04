import { AutoIncrement, PrimaryKey, ReflectionKind } from "@deepkit/type";

import {
  Orderable,
  RestCrudOrderMapFactory,
} from "./rest-crud-order-map-factory";

describe("RestCrudOrderMapFactory", () => {
  let factory: RestCrudOrderMapFactory;

  beforeEach(() => {
    factory = new RestCrudOrderMapFactory();
  });

  it("should work", async () => {
    class MyEntity {
      id: number & AutoIncrement & PrimaryKey & Orderable = 0;
      name!: string;
    }
    const s = factory.build<MyEntity>();
    expect(s.getPropertyNames()).toEqual(["id"]);
    expect(s.getProperty("id")).toMatchObject({
      property: {
        optional: true,
        type: {
          kind: ReflectionKind.union,
          types: [
            { kind: ReflectionKind.literal, literal: "asc" },
            { kind: ReflectionKind.literal, literal: "desc" },
          ],
        },
      },
    });
  });
});
