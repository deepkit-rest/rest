export class RequestSession {
  user?: RequestSessionUser;
}

// TODO: determine user fields to store
export interface RequestSessionUser {
  id: string;
}
