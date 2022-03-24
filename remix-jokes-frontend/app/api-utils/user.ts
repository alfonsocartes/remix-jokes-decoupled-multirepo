import { User } from "@prisma/client";
import { getAccessToken, logout } from "~/utils/session.server";

export async function getUser(req: Request): Promise<User | null> {
  try {
    const accessToken = await getAccessToken(req);
    if (!accessToken) {
      // user not logged in
      return null;
    }

    const response = await fetch(`${process.env.API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const { user } = await response.json();
    return user;
  } catch (error) {
    console.error("getUser error", error);
    throw logout(req);
  }
}
