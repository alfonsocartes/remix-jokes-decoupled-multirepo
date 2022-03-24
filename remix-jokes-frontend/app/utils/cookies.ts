import { createCookie } from "remix";

export const userPrefs = createCookie("user-prefs", {
  // normally you want this to be `secure: true`
  // but that doesn't work on localhost for Safari
  // https://web.dev/when-to-use-local-https/
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  httpOnly: true,
});
