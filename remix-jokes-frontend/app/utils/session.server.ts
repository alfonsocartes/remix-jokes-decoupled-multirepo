import jwt from "jsonwebtoken";
import { createCookieSessionStorage, redirect } from "remix";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
if (!accessTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET must be set");
}

export const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_auth_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 365 days
    httpOnly: true,
  },
});

export async function createAuthSession(
  accessToken: string,
  refreshToken: string,
  redirectTo: string
) {
  const session = await storage.getSession();
  session.set("accessToken", accessToken);
  session.set("refreshToken", refreshToken);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function refreshAccessTokenSession(
  request: Request
): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  const session = await storage.getSession(cookieHeader);
  const accessToken = session.get("accessToken");
  const refreshToken = session.get("refreshToken");

  if (!accessToken || !refreshToken) {
    return null;
  }

  if (!accessTokenSecret) {
    throw new Error("ACCESS_TOKEN_SECRET must be set");
  }

  try {
    jwt.verify(accessToken, accessTokenSecret);
    console.log("OLD ACCESS TOKEN VALID");
    return null;
  } catch (error) {
    // access token has expireD
    const newAccessToken = await refreshAccessToken(request);
    console.log("NEW ACCESS TOKEN");
    session.set("accessToken", newAccessToken);
    const cookie = await storage.commitSession(session);
    return cookie;
  }
}

export async function getAccessToken(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const session = await storage.getSession(cookieHeader);
  const accessToken = session.get("accessToken");
  const refreshToken = session.get("refreshToken");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return accessToken;

  // // check if the access token has not expired
  // if (!accessTokenSecret) {
  //   throw new Error("ACCESS_TOKEN_SECRET must be set");
  // }
  // try {
  //   jwt.verify(accessToken, accessTokenSecret);
  //   return accessToken;
  // } catch (error) {
  //   // access token has expired
  //   const newAccessToken = await refreshAccessToken(request);

  //   console.error(
  //     "! TODO: UPDATE THE ACCESS TOKEN COOKIE. Refreshing OK but not setting the new one in the session"
  //   );

  //   // I'm currently checking the access token in the root route loader, but if
  //   // session.set("accessToken", newAccessToken);
  //   // const cookie = await storage.commitSession(session);
  //   // return cookie;
  //   // to be used in:
  //   // {
  //   //   header:
  //   //   {
  //   //     "Set-Cookie": setCookie,
  //   //   }
  //   // }

  //   return newAccessToken;
  // }
}

export async function refreshAccessToken(req: Request) {
  const cookieHeader = req.headers.get("Cookie");
  const session = await storage.getSession(cookieHeader);
  const refreshToken = session.get("refreshToken");
  if (!refreshToken) {
    // ask user to login again
    throw new Error("Refresh token not found in cookie");
  }

  // get new access token from API
  const response = await fetch(`${process.env.API_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }), // this should be passed in the header because the refresh token is already in the cookie?
  });

  const { accessToken } = await response.json();
  if (!accessToken) {
    // ask user to login again
    throw new Error("Access token not found in response");
  }

  return accessToken;
}

type LoginForm = {
  username: string;
  password: string;
};

export async function register({ username, password }: LoginForm) {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    const { accessToken, refreshToken } = data;

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function login({ username, password }: LoginForm) {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    const { accessToken, refreshToken } = data;

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function logout(request: Request) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}
