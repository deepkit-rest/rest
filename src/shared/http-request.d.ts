import "@deepkit/http";

declare module "@deepkit/http" {
  interface HttpRequest {
    user: HttpRequestUser;
  }
}

// TODO: determine user fields to store
interface HttpRequestUser {
  id: string;
}
