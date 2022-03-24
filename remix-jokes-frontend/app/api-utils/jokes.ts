import { Joke } from "@prisma/client";
import { redirect } from "remix";
import {
  getAccessToken,
  logout,
  refreshAccessToken,
} from "~/utils/session.server";

export interface CreateJokeInputData {
  name: string;
  content: string;
}

export async function createJoke(
  request: Request,
  data: CreateJokeInputData
): Promise<Joke> {
  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    // user not logged in
    throw logout(request);
  }

  try {
    // Authorized route. The access token has the userId in the JWT payload
    const response = await fetch(`${process.env.API_URL}/jokes/new/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // prettier-ignore
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    // token is not valid get a new access token using the refresh token
    if (response.status === 401) {
      // This can throw an error:
      await refreshAccessToken(request);
      return createJoke(request, data); // make the request again with refreshed access token in the cookie
    }

    const { joke } = await response.json();
    return joke;
  } catch (error) {
    throw logout(request);
  }
}

export async function getAllJokes(request: Request): Promise<Joke[]> {
  try {
    const response = await fetch(`${process.env.API_URL}/jokes`);
    const { jokeListItems } = await response.json();
    return jokeListItems;
  } catch (error) {
    console.error("getAllJokes error", error);
    return [];
  }
}

export async function getJoke(
  request: Request,
  jokeId: string
): Promise<Joke | null> {
  try {
    const response = await fetch(`${process.env.API_URL}/jokes/${jokeId}`);
    const { joke } = await response.json();
    return joke;
  } catch (error) {
    console.error("getJoke error", error);
    return null;
  }
}

export async function getUsersJokes(request: Request): Promise<Joke[]> {
  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    // user not logged in
    throw logout(request);
  }

  try {
    // Authorized route. The access token has the userId in the JWT payload
    const response = await fetch(`${process.env.API_URL}/jokes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // prettier-ignore
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const { jokeListItems } = await response.json();
    return jokeListItems;
  } catch (error) {
    console.error("getUsersJokes error", error);
    throw logout(request);
  }
}

export async function deleteJoke(request: Request, jokeId: string) {
  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    // user not logged in
    throw logout(request);
  }
  try {
    // Authorized route. The access token has the userId in the JWT payload
    const response = await fetch(`${process.env.API_URL}/jokes/${jokeId}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        // prettier-ignore
        "Authorization": `Bearer ${accessToken}`,
      },
    });
    if (response.status === 200) {
      return redirect("/jokes");
    } else {
      const { message } = await response.json();
      throw new Response(message, { status: response.status });
    }
  } catch (error) {
    throw logout(request);
  }
}
