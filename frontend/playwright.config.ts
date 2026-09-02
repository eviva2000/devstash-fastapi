import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const uvCacheDirectory = join(tmpdir(), "devstash-fastapi-uv-cache");
const apiPort = process.env.DEVSTASH_E2E_API_PORT ?? "8000";
const frontendPort = process.env.DEVSTASH_E2E_FRONTEND_PORT ?? "5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "FastAPI",
      command: `uv run --offline alembic upgrade head && uv run --offline uvicorn devstash.main:app --app-dir src --host 127.0.0.1 --port ${apiPort}`,
      cwd: "..",
      env: {
        ...process.env,
        UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? uvCacheDirectory,
      },
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer:
        !process.env.CI && !process.env.DEVSTASH_E2E_ISOLATED,
      timeout: 120_000,
    },
    {
      name: "Vite",
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      env: {
        ...process.env,
        DEVSTASH_API_TARGET: `http://127.0.0.1:${apiPort}`,
      },
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer:
        !process.env.CI && !process.env.DEVSTASH_E2E_ISOLATED,
      timeout: 120_000,
    },
  ],
});
