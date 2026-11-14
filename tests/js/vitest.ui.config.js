import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

// React provider / panel / print host tests (jsdom). Inertia, react-hot-toast
// and react-to-print are replaced with tiny stubs in tests/js/stubs.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const stub = (f) => path.resolve(here, "stubs", f);

export default defineConfig({
    root,
    esbuild: { jsx: "automatic" },
    resolve: {
        alias: [
            { find: /^@inertiajs\/react$/, replacement: stub("inertia.js") },
            { find: /^react-hot-toast$/, replacement: stub("toast.js") },
            { find: /^react-to-print$/, replacement: stub("rtp.js") },
            { find: /^@\//, replacement: path.resolve(root, "resources/js") + "/" },
        ],
    },
    test: {
        globals: true,
        environment: "jsdom",
        include: ["tests/js/ui/**/*.test.jsx"],
        testTimeout: 20000,
    },
});
