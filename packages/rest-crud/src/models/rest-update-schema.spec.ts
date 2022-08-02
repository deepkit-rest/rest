import { MaxLength, ReflectionKind, validationAnnotation } from "@deepkit/type";

import { InUpdate, RestUpdateSchemaFactory } from "./rest-update-schema";

describe("RestUpdateSchemaFactory", () => {
  let factory: RestUpdateSchemaFactory;

  beforeEach(() => {
    factory = new RestUpdateSchemaFactory();
  });

  test("basic", () => {
    class E {
      id!: number;
      name!: string & InUpdate & MaxLength<1>;
    }
    const schema = factory.build(E);
    expect(schema.getPropertyNames()).toEqual(["name"]);
    expect(schema.getProperty("name").property).toMatchObject({
      optional: true,
      type: {
        kind: ReflectionKind.string,
        annotations: expect.objectContaining({
          [validationAnnotation.symbol]: expect.anything(),
        }),
      },
    });
  });
});
