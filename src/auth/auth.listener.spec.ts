import { AuthListener } from "./auth.listener";

describe("AuthListener", () => {
  let listener: AuthListener;

  describe("onController", () => {
    it("should do nothing if route is not protected", async () => {
      listener = new AuthListener({} as any);
      const event = {
        route: { groups: [] },
        get headers() {
          return {};
        },
      };
      const mockEventHeaders = jest.spyOn(event, "headers", "get");
      await listener.onController(event as any);
      expect(mockEventHeaders).not.toHaveBeenCalled();
    });
  });
});
