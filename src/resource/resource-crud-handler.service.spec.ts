import { ResourceCrudHandler } from "./resource-crud-handler.service";

describe("ResourceService", () => {
  let service: ResourceCrudHandler<any>;

  beforeEach(() => {
    service = new ResourceCrudHandler();
  });

  describe("applyPagination", () => {
    it("should paginate", () => {
      const query = {
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      const pagination = { limit: 10, offset: 20 };
      service.applyPagination(query as any, pagination);
      expect(query.limit).toHaveBeenCalledWith(10);
      expect(query.skip).toHaveBeenCalledWith(20);
    });
  });

  describe("applyFilterMap", () => {
    it("should apply the filters correctly", () => {
      const query = { addFilter: jest.fn().mockReturnThis() };
      const filterMap = { name: { $eq: "test" } };
      service.applyFilterMap(query as any, filterMap);
      expect(query.addFilter).toHaveBeenCalledTimes(1);
      expect(query.addFilter).toHaveBeenCalledWith("name", { $eq: "test" });
    });
  });

  describe("applyOrderMap", () => {
    it("should apply the orders correctly", () => {
      const query = { orderBy: jest.fn().mockReturnThis() };
      const orderMap = { name: "asc" } as const;
      service.applyOrderMap(query as any, orderMap);
      expect(query.orderBy).toHaveBeenCalledTimes(1);
      expect(query.orderBy).toHaveBeenCalledWith("name", "asc");
    });
  });
});
