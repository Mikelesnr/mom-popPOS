import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

// Replication, WebRTC, printing and db helper tests (Node, no DOM).
// The repo has no JS test tooling yet; see tests/js/README.md.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
    root,
    test: {
        globals: true,
        environment: "node",
        include: ["tests/js/sync/**/*.test.js"],
        testTimeout: 30000,
    },
});
