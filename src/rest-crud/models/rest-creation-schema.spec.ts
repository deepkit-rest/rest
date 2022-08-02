import { MaxLength, ReflectionKind, validationAnnotation } from "@deepkit/type";

import { InCreation, RestCreationSchemaFactory } from "./rest-creation-schema";

describe("RestCreationSchemaFactory", () => {
  let factory: RestCreationSchemaFactory;

  beforeEach(() => {
    factory = new RestCreationSchemaFactory();
  });

  test("basic", () => {
    class E {
      id!: number;
      name!: string & InCreation & MaxLength<1>;
      name2?: string & InCreation;
    }
    const schema = factory.build(E);
    expect(schema.getPropertyNames()).toEqual(["name", "name2"]);
    expect(schema.getProperty("name").property).toMatchObject({
      optional: undefined,
      type: {
        kind: ReflectionKind.string,
        annotations: expect.objectContaining({
          [validationAnnotation.symbol]: expect.anything(),
        }),
      },
    });
    expect(schema.getProperty("name2").property).toMatchObject({
      optional: true,
      type: { kind: ReflectionKind.string },
    });
  });
});
