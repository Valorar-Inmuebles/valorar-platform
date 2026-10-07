import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import config from "./vitest.config";

const revision = "c0bdbd75a3388641d5af6e6fb2d616fb1ed960e1";
const baselineFiles = [
  "lib/property/load-property-executive-context.ts",
  "lib/property/load-publishability-context.ts",
  "lib/property/load-commercialization-context.ts",
  "app/(dashboard)/propiedades/[id]/page.tsx",
  "app/(dashboard)/propiedades/[id]/publicaciones/page.tsx",
  "app/(dashboard)/propiedades/[id]/caracteristicas/page.tsx",
  "app/(dashboard)/propiedades/[id]/imagenes/page.tsx",
];

// Re-run exactly the same page/transport harness using the frozen pre-change
// loaders from Git, without checking out files or accessing a database.
export default mergeConfig(
  { ...config, test: { ...config.test, include: [] } },
  defineConfig({
    define: { "process.env.PROPERTY_DETAIL_BASELINE": JSON.stringify("1") },
    plugins: [
      {
        name: "property-detail-baseline",
        enforce: "pre",
        load(id) {
          const normalized = id.replaceAll("\\", "/");
          const path = baselineFiles.find((file) =>
            normalized.endsWith(`/apps/admin/${file}`),
          );
          if (!path) return null;
          return execFileSync(
            "git",
            ["show", `${revision}:apps/admin/${path}`],
            {
              cwd: fileURLToPath(new URL("../..", import.meta.url)),
              encoding: "utf8",
            },
          );
        },
      },
    ],
    test: { include: ["lib/property/detail-loaders.spec.ts"] },
  }),
);
