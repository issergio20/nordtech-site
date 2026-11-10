// Локальный просмотр варианта 2: npm run dev:v2 → http://localhost:8081 (отдельная папка сборки _site_v2)
import { spawn } from "node:child_process";
spawn("npx", ["@11ty/eleventy", "--serve", "--port=8081", "--output=_site_v2"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, VARIANT: "2" },
}).on("exit", (code) => process.exit(code ?? 0));
