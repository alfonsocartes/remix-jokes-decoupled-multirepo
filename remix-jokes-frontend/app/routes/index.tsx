import {
  ActionFunction,
  Form,
  json,
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  redirect,
  useLoaderData,
} from "remix";
import { Link } from "remix";
import stylesUrl from "../styles/index.css";
import { userPrefs } from "~/utils/cookies";
import { refreshAccessTokenSession } from "~/utils/session.server";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: stylesUrl,
    },
  ];
};

export const meta: MetaFunction = () => {
  return {
    title: "Remix: So great, it's funny!",
    description: "Remix jokes app. Learn Remix and laugh at the same time!",
  };
};

// export const loader: LoaderFunction = async ({ request }) => {
//   const cookieHeader = request.headers.get("Cookie");
//   const cookie = (await userPrefs.parse(cookieHeader)) || {};
//   return { showBanner: cookie.showBanner };
// };

export const loader: LoaderFunction = async ({ request }) => {
  const cookie = await refreshAccessTokenSession(request);
  if (cookie) request.headers.set("Cookie", cookie);
  let data = null;

  /* -- actual loader data fetching */
  const cookieHeader = request.headers.get("Cookie");
  const userPrefsCookie = (await userPrefs.parse(cookieHeader)) || {};
  const showBanner = userPrefsCookie.showBanner;
  console.log("showBanner", showBanner);
  data = { showBanner };
  /* actual loader data fetching --*/

  return json(data, cookie ? { headers: { "Set-Cookie": cookie } } : undefined);
};

export const action: ActionFunction = async ({ request }) => {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await userPrefs.parse(cookieHeader)) || {};
  const bodyParams = await request.formData();

  if (bodyParams.get("bannerVisibility") === "hidden") {
    cookie.showBanner = false;
  }

  return redirect("/", {
    headers: {
      "Set-Cookie": await userPrefs.serialize(cookie),
    },
  });
};

export default function Index() {
  const data = useLoaderData();
  const { showBanner } = data;
  console.log("showBanner", showBanner);

  return (
    <div className="container">
      <div className="content">
        <h1>
          Remix <span>Jokes!</span>
        </h1>
        <nav>
          <ul>
            <li>
              <Link to="jokes">Read Jokes</Link>
            </li>
          </ul>
        </nav>
      </div>
      {showBanner ? (
        <div>
          <span>This website uses cookies</span>
          <Form method="post">
            <input type="hidden" name="bannerVisibility" value="hidden" />
            <button type="submit">Hide</button>
          </Form>
        </div>
      ) : null}
    </div>
  );
}
