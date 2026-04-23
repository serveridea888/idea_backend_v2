require("dotenv/config");

const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

let accessToken = "";
let cookie = "";
let pass = 0;
let fail = 0;
let serverProcess = null;
const failures = [];
const serverLogs = [];

function accept(expected, status) {
  return Array.isArray(expected) ? expected.includes(status) : status === expected;
}

function expectedLabel(expected) {
  return Array.isArray(expected) ? expected.join("|") : String(expected);
}

function logPass(label, code) {
  console.log(`PASS ${label} -> ${code}`);
  pass += 1;
}

function logFail(label, got, expected, body) {
  const snippet = typeof body === "string" ? body.slice(0, 300).replace(/\n/g, " ") : "";
  console.log(`FAIL ${label} -> got ${got} expected ${expectedLabel(expected)}${snippet ? ` | body=${snippet}` : ""}`);
  fail += 1;
  failures.push({ label, got, expected: expectedLabel(expected), body: snippet });
}

function getNpmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function getTsxExecutable() {
  return process.platform === "win32"
    ? path.join(process.cwd(), "node_modules", ".bin", "tsx.cmd")
    : path.join(process.cwd(), "node_modules", ".bin", "tsx");
}

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(getNpmExecutable(), ["run", scriptName], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command npm run ${scriptName} failed with code ${code}`));
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine a free port")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

function appendServerLog(chunk) {
  serverLogs.push(chunk.toString());
  if (serverLogs.length > 50) {
    serverLogs.shift();
  }
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(getTsxExecutable(), ["src/server.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "127.0.0.1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverProcess = child;

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Timeout while starting server"));
    }, 30000);

    const handleOutput = (chunk) => {
      appendServerLog(chunk);
      if (settled) return;

      if (chunk.toString().includes("Server listening")) {
        settled = true;
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve();
      return;
    }

    const child = serverProcess;
    serverProcess = null;

    if (child.exitCode !== null) {
      resolve();
      return;
    }

    child.once("exit", () => resolve());
    child.kill("SIGTERM");

    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }, 5000);
  });
}

async function req(baseUrl, { method = "GET", path = "/", body, auth = false, withCookie = false, expected = 200, headers = {} }) {
  const requestHeaders = { ...headers };

  if (auth && accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;
  if (withCookie && cookie) requestHeaders.Cookie = cookie;

  let payload;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  } else {
    payload = body;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: payload,
  });

  const text = await response.text();
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }

  const label = `${method} ${path}`;
  if (accept(expected, response.status)) {
    logPass(label, response.status);
  } else {
    logFail(label, response.status, expected, text);
  }

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: response.status, text, json };
}

async function runSmoke(baseUrl) {
  await req(baseUrl, { method: "GET", path: "/tags", expected: 200 });
  await req(baseUrl, { method: "GET", path: "/banner", expected: [200, 404] });
  await req(baseUrl, { method: "GET", path: "/notice", expected: [200, 404] });
  await req(baseUrl, { method: "GET", path: "/about", expected: [200, 404] });
  await req(baseUrl, { method: "GET", path: "/search?q=te", expected: 200 });
  await req(baseUrl, { method: "GET", path: "/articles", expected: 200 });
  await req(baseUrl, { method: "GET", path: "/news", expected: 200 });
  await req(baseUrl, { method: "GET", path: "/articles/nao-existe", expected: 404 });
  await req(baseUrl, { method: "GET", path: "/news/nao-existe", expected: 404 });
  await req(baseUrl, { method: "GET", path: "/tags/nao-existe", expected: 404 });

  const subscriber = await req(baseUrl, {
    method: "POST",
    path: "/subscribers",
    body: { email: `smoke.${Date.now()}@example.com` },
    expected: 201,
  });
  const subscriberId = subscriber.json?.id;

  const subscriberToDelete = await req(baseUrl, {
    method: "POST",
    path: "/subscribers",
    body: { email: `smoke.delete.${Date.now()}@example.com` },
    expected: 201,
  });
  const subscriberDeleteId = subscriberToDelete.json?.id;

  const login = await req(baseUrl, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
    expected: 200,
  });

  accessToken = login.json?.accessToken || "";
  if (accessToken) {
    logPass("access token capturado", 200);
  } else {
    logFail("access token capturado", "empty", "non-empty", login.text);
  }

  await req(baseUrl, { method: "POST", path: "/auth/refresh", expected: 200, withCookie: true });
  await req(baseUrl, { method: "GET", path: "/subscribers", expected: 200, auth: true });

  const tag = await req(baseUrl, {
    method: "POST",
    path: "/tags",
    body: { name: `Tag Smoke ${Date.now()}` },
    expected: 201,
    auth: true,
  });
  const tagId = tag.json?.id;

  if (tagId) {
    await req(baseUrl, { method: "GET", path: `/tags/${tagId}`, expected: 200 });
    await req(baseUrl, {
      method: "PUT",
      path: `/tags/${tagId}`,
      body: { name: `Tag Smoke Updated ${Date.now()}` },
      expected: 200,
      auth: true,
    });
  } else {
    logFail("tag id capturado", "empty", "non-empty", tag.text);
  }

  const article = await req(baseUrl, {
    method: "POST",
    path: "/articles",
    body: {
      metaTitle: `Artigo Smoke ${Date.now()}`,
      content: "conteudo teste",
      status: "DRAFT",
      tagIds: tagId ? [tagId] : [],
    },
    expected: 201,
    auth: true,
  });
  const articleId = article.json?.id;

  if (articleId) {
    await req(baseUrl, { method: "GET", path: `/articles/${articleId}`, expected: 200 });
    await req(baseUrl, {
      method: "PUT",
      path: `/articles/${articleId}`,
      body: { metaTitle: "Artigo Smoke Atualizado", content: "conteudo atualizado" },
      expected: 200,
      auth: true,
    });
  } else {
    logFail("article id capturado", "empty", "non-empty", article.text);
  }

  const news = await req(baseUrl, {
    method: "POST",
    path: "/news",
    body: {
      metaTitle: `News Smoke ${Date.now()}`,
      content: "conteudo news teste",
      status: "DRAFT",
      tagIds: tagId ? [tagId] : [],
    },
    expected: 201,
    auth: true,
  });
  const newsId = news.json?.id;

  if (newsId) {
    await req(baseUrl, { method: "GET", path: `/news/${newsId}`, expected: 200 });
    await req(baseUrl, {
      method: "PUT",
      path: `/news/${newsId}`,
      body: { metaTitle: "News Smoke Atualizada", content: "conteudo news atualizado" },
      expected: 200,
      auth: true,
    });
  } else {
    logFail("news id capturado", "empty", "non-empty", news.text);
  }

  const banner = await req(baseUrl, {
    method: "POST",
    path: "/banners",
    body: { imageUrl: "https://example.com/banner.png", title: "Banner Smoke" },
    expected: 201,
    auth: true,
  });
  const bannerId = banner.json?.id;
  await req(baseUrl, { method: "GET", path: "/banners", expected: 200, auth: true });
  await req(baseUrl, { method: "GET", path: "/banner", expected: 200 });
  if (bannerId) {
    await req(baseUrl, {
      method: "PUT",
      path: `/banners/${bannerId}`,
      body: { title: "Banner Smoke Updated", isActive: true },
      expected: 200,
      auth: true,
    });
  }

  const notice = await req(baseUrl, {
    method: "POST",
    path: "/notices",
    body: { message: "Aviso Smoke", badge: "INFO" },
    expected: 201,
    auth: true,
  });
  const noticeId = notice.json?.id;
  await req(baseUrl, { method: "GET", path: "/notices", expected: 200, auth: true });
  await req(baseUrl, { method: "GET", path: "/notice", expected: 200 });
  if (noticeId) {
    await req(baseUrl, {
      method: "PUT",
      path: `/notices/${noticeId}`,
      body: { message: "Aviso Smoke Updated", isActive: true },
      expected: 200,
      auth: true,
    });
  }

  await req(baseUrl, {
    method: "PUT",
    path: "/about",
    body: {
      title: "Sobre Smoke",
      description: "desc",
      mission: "missao",
      vision: "visao",
      stats: [{ label: "Clientes", value: "10" }],
    },
    expected: 200,
    auth: true,
  });
  await req(baseUrl, { method: "GET", path: "/about", expected: 200 });

  await req(baseUrl, {
    method: "POST",
    path: "/newsletter/send",
    body: { subject: "Smoke newsletter", content: "<p>teste</p>" },
    expected: 200,
    auth: true,
  });

  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xf4QAAAAASUVORK5CYII=",
    "base64"
  );
  const blob = new Blob([pixel], { type: "image/png" });
  const form = new FormData();
  form.append("file", blob, "pixel.png");
  await req(baseUrl, {
    method: "POST",
    path: "/upload?folder=smoke",
    body: form,
    expected: 201,
    auth: true,
  });

  if (articleId) {
    await req(baseUrl, { method: "DELETE", path: `/articles/${articleId}`, expected: 204, auth: true });
  }
  if (newsId) {
    await req(baseUrl, { method: "DELETE", path: `/news/${newsId}`, expected: 204, auth: true });
  }
  if (tagId) {
    await req(baseUrl, { method: "DELETE", path: `/tags/${tagId}`, expected: 204, auth: true });
  }
  if (subscriberDeleteId) {
    await req(baseUrl, {
      method: "DELETE",
      path: `/subscribers/${subscriberDeleteId}`,
      expected: 204,
      auth: true,
    });
  }
  if (subscriberId) {
    await req(baseUrl, {
      method: "POST",
      path: `/subscribers/unsubscribe/${subscriberId}`,
      expected: 200,
    });
  }

  await req(baseUrl, { method: "POST", path: "/auth/logout", expected: 200, withCookie: true });

  const referenceResponse = await fetch(`${baseUrl}/reference`);
  if ([200, 301, 302].includes(referenceResponse.status)) {
    logPass("GET /reference", referenceResponse.status);
  } else {
    logFail("GET /reference", referenceResponse.status, [200, 301, 302], await referenceResponse.text());
  }
}

async function main() {
  const baseUrlFromEnv = process.env.SMOKE_BASE_URL;
  const shouldManageServer = !baseUrlFromEnv;
  const port = shouldManageServer ? await getFreePort() : null;
  const baseUrl = baseUrlFromEnv || `http://127.0.0.1:${port}`;

  try {
    if (shouldManageServer) {
      await runNpmScript("db:seed");
      await startServer(port);
    }

    await runSmoke(baseUrl);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    fail += 1;
  } finally {
    await stopServer();
  }

  console.log(`RESULT pass=${pass} fail=${fail}`);

  if (failures.length > 0) {
    console.log(`FAILURES_JSON=${JSON.stringify(failures)}`);
  }

  if (fail > 0) {
    if (serverLogs.length > 0) {
      console.log("SERVER_LOGS_START");
      console.log(serverLogs.join(""));
      console.log("SERVER_LOGS_END");
    }
    process.exit(1);
  }
}

main();
