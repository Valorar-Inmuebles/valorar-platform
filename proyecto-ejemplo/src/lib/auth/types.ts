export type AuthUser = {
  id: string;
  email: string;
};

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  email: string;
};
