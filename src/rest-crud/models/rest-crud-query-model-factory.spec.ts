import { FieldName } from "@deepkit/orm";
import {
  ReflectionClass,
  ReflectionKind,
  ReflectionProperty,
} from "@deepkit/type";

import {
  AddPropertyOptions,
  RestCrudQueryModelFactory,
} from "./rest-crud-query-model-factory";

describe("RestCrudQueryModelFactory", () => {
  class TestingFactory extends RestCrudQueryModelFactory {
    protected static override selectValidFields<Entity>(
      entitySchema: ReflectionClass<any>,
    ): FieldName<Entity>[] {
      return entitySchema
        .getProperties()
        .map((p) => p.name as FieldName<Entity>);
    }

    protected static override transformField(
      entitySchema: ReflectionClass<any>,
      fieldSchema: ReflectionProperty,
    ): AddPropertyOptions {
      const { name, type } = fieldSchema.property;
      return { name, type, optional: true };
    }
  }

  class TestingEntity {
    id!: number;
    name?: string;
  }

  it("should work", () => {
    {
      const s = TestingFactory.build<TestingEntity>("all", "include");
      expect(s.getPropertyNames()).toEqual(["id", "name"]);
      expect(s.getProperty("id").property).toMatchObject({
        type: { kind: ReflectionKind.number },
        optional: true,
      });
      expect(s.getProperty("name").property).toMatchObject({
        type: { kind: ReflectionKind.string },
        optional: true,
      });
    }
    {
      const s = TestingFactory.build<TestingEntity>("all", "exclude");
      expect(s.getPropertyNames()).toEqual([]);
    }
    {
      const s = TestingFactory.build<TestingEntity>(["id"], "include");
      expect(s.getPropertyNames()).toEqual(["id"]);
      expect(s.getProperty("id").property).toMatchObject({
        type: { kind: ReflectionKind.number },
        optional: true,
      });
    }
    {
      const s = TestingFactory.build<TestingEntity>(["id"], "exclude");
      expect(s.getPropertyNames()).toEqual(["name"]);
      expect(s.getProperty("name").property).toMatchObject({
        type: { kind: ReflectionKind.string },
        optional: true,
      });
    }
  });
});
