import { json, LoaderFunction } from "remix";
import { useLoaderData, Link, useCatch } from "remix";
import type { Joke } from "@prisma/client";
import { refreshAccessTokenSession } from "~/utils/session.server";

type LoaderData = { randomJoke: Joke };

export const loader: LoaderFunction = async ({ request }) => {
  const cookie = await refreshAccessTokenSession(request);
  if (cookie) request.headers.set("Cookie", cookie);
  let data = null;

  /* -- actual loader data fetching */
  const response = await fetch(`${process.env.API_URL}/jokes/random/`);
  const { randomJoke } = await response.json();
  if (!randomJoke) {
    throw new Response("No random joke found", {
      status: 404,
    });
  }
  data = { randomJoke };
  /* actual loader data fetching --*/

  return json(data, cookie ? { headers: { "Set-Cookie": cookie } } : undefined);
};

export default function JokesIndexRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's a random joke:</p>
      <p>{data.randomJoke.content}</p>
      <Link to={data.randomJoke.id}>"{data.randomJoke.name}" Permalink</Link>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return (
      <div className="error-container">There are no jokes to display.</div>
    );
  }
  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary() {
  return <div className="error-container">I did a whoopsies.</div>;
}
