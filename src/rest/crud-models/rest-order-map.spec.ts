import {
  AutoIncrement,
  PrimaryKey,
  ReflectionKind,
  validationAnnotation,
} from "@deepkit/type";

import { Orderable, RestOrderMapFactory } from "./rest-order-map";

describe("RestOrderMapFactory", () => {
  let factory: RestOrderMapFactory;

  beforeEach(() => {
    factory = new RestOrderMapFactory();
  });

  it("should work", async () => {
    class MyEntity {
      id: number & AutoIncrement & PrimaryKey & Orderable = 0;
      name!: string;
    }
    const s = factory.build(MyEntity);
    expect(s.getPropertyNames()).toEqual(["id"]);
    expect(s.getProperty("id")).toMatchObject({
      property: {
        optional: true,
        type: {
          kind: ReflectionKind.string,
          annotations: {
            [validationAnnotation.symbol]: [
              { name: "pattern", args: expect.any(Array) },
            ],
          },
        },
      },
    });
  });
});
