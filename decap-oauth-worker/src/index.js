const COOKIE_NAME = "decap_oauth_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCookie(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(v.join("="));
  }
  return out;
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function postMessageHtml(provider, status, payload) {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
  <body>
    <script>
      (function () {
        function receiveMessage(message) {
          window.opener.postMessage(
            "authorization:${provider}:${status}:${json}",
            message.origin
          );
          window.removeEventListener("message", receiveMessage, false);
          window.close();
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:${provider}", "*");
      })();
    </script>
  </body>
</html>`;
}

async function exchangeGithubToken(code, env, redirectUri) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  return res.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok");
    }

    if (url.pathname === "/auth") {
      const provider = url.searchParams.get("provider") || "github";
      if (provider !== "github") {
        return html("Unsupported provider", 400);
      }

      if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET) {
        return html("Missing OAuth environment variables", 500);
      }

      const state = randomState();
      const callback = `${url.origin}/callback`;
      const githubAuth = new URL("https://github.com/login/oauth/authorize");
      githubAuth.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
      githubAuth.searchParams.set("redirect_uri", callback);
      githubAuth.searchParams.set("scope", "repo");
      githubAuth.searchParams.set("state", state);

      return new Response(null, {
        status: 302,
        headers: {
          location: githubAuth.toString(),
          "set-cookie": `${COOKIE_NAME}=${state}; Max-Age=${STATE_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }

    if (url.pathname === "/callback") {
      const provider = url.searchParams.get("provider") || "github";
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const cookie = parseCookie(request.headers.get("cookie") || "");
      const cookieState = cookie[COOKIE_NAME];

      if (!code || !state || !cookieState || state !== cookieState) {
        const body = postMessageHtml(provider, "error", {
          error: "Invalid or missing OAuth state",
        });
        return html(body, 400);
      }

      const callback = `${url.origin}/callback`;
      const tokenRes = await exchangeGithubToken(code, env, callback);

      if (!tokenRes.access_token) {
        const body = postMessageHtml(provider, "error", {
          error: tokenRes.error || "OAuth token exchange failed",
          error_description: tokenRes.error_description,
        });
        return new Response(body, {
          status: 400,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "set-cookie": `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }

      const body = postMessageHtml(provider, "success", {
        token: tokenRes.access_token,
        provider,
      });
      return new Response(body, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "set-cookie": `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }

    return html("Not found", 404);
  },
};
