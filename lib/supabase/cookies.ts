export type CookieSameSite = "lax" | "strict" | "none";

export type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | CookieSameSite;
  secure?: boolean;
  priority?: "low" | "medium" | "high";
};

export type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};
