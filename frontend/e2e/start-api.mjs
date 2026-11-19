// Prepares the isolated e2e database (migrate, seed, admin) and then runs the API in the foreground.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const backend = path.resolve(import.meta.dirname, "../../backend");
const venvPy = [path.join(backend, ".venv/Scripts/python.exe"), path.join(backend, ".venv/bin/python")].find((p) => fs.existsSync(p));
const py = process.env.PYTHON ?? venvPy ?? "python";
const port = process.env.E2E_API_PORT ?? "8011";

const env = {
  ...process.env,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgresql+psycopg://saree:saree_local_pw@localhost:5433/saree_e2e",
  JWT_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
  ENVIRONMENT: "test",
  CORS_ORIGINS: `http://localhost:${process.env.E2E_WEB_PORT ?? "3100"}`,
  UPLOAD_DIR: path.join(backend, "uploads_e2e"),
  ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.com",
  ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD ?? "e2e-only-password-123",
  PYTHONPATH: backend,
};

function run(args) {
  const r = spawnSync(py, args, { cwd: backend, env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(["-m", "app.cli", "migrate"]);
run(["-m", "app.cli", "seed", "--reset"]);
run(["-m", "app.cli", "create-admin"]);
const api = spawn(py, ["-m", "uvicorn", "app.main:app", "--port", port], { cwd: backend, env, stdio: "inherit" });
api.on("exit", (c) => process.exit(c ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => api.kill());
