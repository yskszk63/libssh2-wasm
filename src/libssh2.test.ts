import { spawn } from "child_process";
import { fileURLToPath } from "url";

let container: undefined | {
  id: string
  ipaddr: string
};

beforeAll(async () => {
  const dir = fileURLToPath(new URL("./libssh2.test/", import.meta.url));
  {
    // TODO timeout
    const proc = spawn("docker", ["buildx", "build", dir, "-t", "libssh2-test-sshd"], { stdio: ["ignore", "inherit", "inherit"] });
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
  }

  let name = "";
  {
    const proc = spawn("docker", ["run", "--rm", "--mount", `type=bind,src=${dir},dst=/conf,readonly`, "-d", "libssh2-test-sshd"], { stdio: ["ignore", "pipe", "inherit"] }); // TODO sanitize
    proc.stdout.on("data", (chunk: Buffer) => name += chunk.toString("utf8"));
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
    name = name.trimEnd();
  }

  let ipaddr = "";
  {
    const proc = spawn("docker", ["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", name], { stdio: ["ignore", "pipe", "inherit"] });
    proc.stdout.on("data", (chunk: Buffer) => ipaddr += chunk.toString("utf8"));
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
    ipaddr = ipaddr.trimEnd();
  }

  container = {
    id: name,
    ipaddr,
  }
});

afterAll(async () => {
  if (typeof container === "undefined") {
    return;
  }

  {
    const proc = spawn("docker", ["kill", container.id], { stdio: ["ignore", "inherit", "inherit"] });
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
  }
});

describe("OK", () => {
  test("empty", () => {});
});
