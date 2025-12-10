import get from "lodash/get.js";
import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Router } from "express";

export interface ServiceConfig {
  name: string;
  desc: string;
  defaultResponse: string;
  uniqueKey?: UniqueKey;
  responses?: Array<{
    id: string;
    name: string;
  }>;
}

export interface UniqueKey {
  modifier: string;
  target: "query" | "path" | "headers" | "body";
  type: string;
}

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const mocksDir = path.join(__dirname, "../mocks");
const serviceConfigs: Record<string, ServiceConfig> = {};
const mockRouter = express.Router();

export function getServiceConfigs(): Record<string, ServiceConfig> {
  return serviceConfigs;
}

export async function loadMockRouters(mocksDir: string): Promise<Router> {
  try {
    console.log(`Mocks directory: ${mocksDir}`);
    if (!fs.existsSync(mocksDir)) {
      console.warn("Mocks directory not found:", mocksDir);
      return mockRouter;
    }

    const items = fs.readdirSync(mocksDir, { withFileTypes: true });

    const directories = items.filter((item) => item.isDirectory());

    console.log(`Found ${directories.length} directories in mocks folder`);

    for (const dir of directories) {
      const serviceName = dir.name;
      console.log(`\nLoading service: ${serviceName}`);
      const router = await getMockRouter(mocksDir, dir);
      if (!router) continue;
      serviceConfigs[serviceName] = getServiceConfig(serviceName, router);
      console.log(`✓ Service '${serviceName}' loaded successfully`);
      mockRouter.use(`/${serviceName}`, router);
    }

    console.log(
      `\n✓ Generated service configs for ${Object.keys(serviceConfigs).length} service(s)`,
    );
  } catch (error) {
    console.error("\n✗ Error loading mock routers:", error);
  }

  return mockRouter;
}

async function getMockRouter(
  mocksDir: string,
  dir: fs.Dirent,
): Promise<Router | null> {
  const serviceName = dir.name;
  const indexPath = path.join(mocksDir, serviceName);

  if (
    fs.existsSync(path.join(indexPath, "index.ts")) ||
    fs.existsSync(path.join(indexPath, "index.js"))
  ) {
    console.log(`  → Loading as JS/TS router`);
    return await getJSRouter(indexPath, serviceName);
  }

  if (fs.existsSync(path.join(indexPath, "index.json"))) {
    console.log(`  → Loading as JSON router`);
    return await getJSONRouter(indexPath, serviceName);
  }

  console.log(`  → Skipping ${serviceName} (no index.(ts|js|json) found)`);
  return null;
}

async function getJSRouter(indexPath: string, serviceName: string) {
  try {
    console.log(`  → Importing module from: ${serviceName}`);
    let modulePath = '';
    if (fs.existsSync(`${indexPath}/index.js`)) {
      modulePath = `${indexPath}/index.js`;
    } else {
      modulePath = `${indexPath}/index.ts`;
    }
    const module = await import(modulePath);
    if (!module.default || typeof module.default !== "function") {
      console.log(
        `  ✗ Module invalid (no default export or default is not a function)`,
      );
      return null;
    }
    console.log(`  ✓ JS/TS router imported successfully`);
    return module.default;
  } catch (error) {
    console.log(`  ✗ Failed to import JS/TS router:`, error);
    return null;
  }
}

async function getJSONRouter(indexPath: string, serviceName: string) {
  console.log(`  → Reading index.json from: ${serviceName}`);
  const data = fs.readFileSync(path.join(indexPath, "index.json"));
  const json = JSON.parse(data.toString());
  console.log(`  → Config: ${json.method?.toUpperCase()} ${json.path}`);

  const responses = fs
    .readdirSync(indexPath)
    .filter((it) => it.endsWith(".json") && !it.startsWith("index"));
  console.log(
    `  → Found ${responses.length} response file(s): ${responses.join(", ")}`,
  );

  const router = express.Router();

  router.prototype.name = json.name;
  router.prototype.desc = json.desc;
  router.prototype.defaultResponse = json.defaultResponse;
  router.prototype.uniqueKey = json.uniqueKey;
  router.prototype.responses = responses.map((it) => {
    const responseData = fs.readFileSync(path.join(indexPath, it));
    const responseJson = JSON.parse(responseData.toString());
    console.log(`    - ${it}: ${responseJson.name}`);
    return { id: it.replace(".json", ""), name: responseJson.name };
  });
  if (
    fs.existsSync(path.join(indexPath, `proxy.js`)) ||
    fs.existsSync(path.join(indexPath, `proxy.ts`))
  ) {
    router.prototype.responses.push({ id: "proxy", name: "Proxy Pass" });
  }

  console.log(`  → Default response: ${json.defaultResponse}`);

  const method = json.method as
    | "get"
    | "post"
    | "put"
    | "delete"
    | "patch"
    | "options";
  console.log(`  → Registering route: ${method.toUpperCase()} ${json.path}`);
  router[method](json.path, async (req, res) => {
    const mappings = (await getMappingsFromReq(
      req,
      serviceConfigs[serviceName]!!.uniqueKey,
    )) as any;
    const expectedResponse =
      mappings && mappings.responses
        ? mappings.responses[serviceName]
        : serviceConfigs[serviceName]!!.defaultResponse;
    console.log(`  → Expected response: ${expectedResponse}`);

    if (expectedResponse === "proxy") {
      const module = await import(`${indexPath}/proxy.js`);
      module.default(req, res);
      return;
    }

    const responseData = fs.readFileSync(
      path.join(indexPath, `${expectedResponse}.json`),
    );
    const responseJson = JSON.parse(responseData.toString());

    // const headers = TemplateEngine.renderObject(responseJson.headers, { req })
    const headers = responseJson.headers;
    // const body = TemplateEngine.renderObject(responseJson.body, { req })
    const body = responseJson.body;

    res.setHeaders(new Headers(headers));
    res.status(parseInt(responseJson.status)).json(body);
  });

  console.log(`  ✓ JSON router created successfully`);
  return router;
}

function getServiceConfig(serviceName: string, router: Router) {
  return {
    name: router.prototype?.name || serviceName,
    desc: router.prototype?.desc || "",
    defaultResponse: router.prototype?.defaultResponse,
    uniqueKey: router.prototype.uniqueKey,
    responses: router.prototype?.responses || [],
  };
}

async function getMappingsFromReq(req: Request, uniqueKey?: UniqueKey) {
  if (!uniqueKey) {
    console.log(`  → No unique key configured, using default response`);
    return null;
  }

  const uniqueKeyValue = get(req[uniqueKey.target], uniqueKey.modifier);
  console.log(
    `  → Looking for unique key: ${uniqueKey.type} = ${uniqueKeyValue} (from ${uniqueKey.target}.${uniqueKey.modifier})`,
  );

  if (!uniqueKeyValue) {
    console.log(
      `  → Unique key value not found in request, using default response`,
    );
    return null;
  }

  // const matches = getStorage().findByUniqueKey('responses', uniqueKey.type, uniqueKeyValue);
  const matches: any[] = [];
  const filtered = matches.length > 0 ? matches[0] : null;
  console.log(
    `  → ${filtered ? "Found a" : "Not found any"} matching response mapping`,
  );
  return filtered;
}
