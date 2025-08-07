import { defineConfig } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { babel } from "@rollup/plugin-babel";
import postcss from "rollup-plugin-postcss";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import terser from "@rollup/plugin-terser";
import replace from "@rollup/plugin-replace";
import { readFileSync, existsSync, rmSync } from "fs";
import { homedir } from "os";
import { resolve, join } from "path";

const isDev = process.env.NODE_ENV !== "production";

// SSL cert paths (same as webpack config)
const sslPath = join(homedir(), ".canopy-ssl");
const httpsOptions = {
  cert: existsSync(join(sslPath, "public.pem"))
    ? readFileSync(join(sslPath, "public.pem"))
    : undefined,
  key: existsSync(join(sslPath, "key.pem"))
    ? readFileSync(join(sslPath, "key.pem"))
    : undefined,
};

// Parse command line arguments for host and port
const hostIndex = process.argv.findIndex((arg) => arg === "--host");
const host =
  hostIndex >= 0 && process.argv[hostIndex + 1]
    ? process.argv[hostIndex + 1]
    : "0.0.0.0";

const portArg = process.argv.find((arg) => /^\d+$/.test(arg));
const defaultPort = process.env.PORT || portArg || "8080";

// Default externals list - comprehensive list from app-loader-ui
const DEFAULT_EXTERNALS = [
  // React ecosystem
  "react",
  "react-dom",
  "react-dom/client",
  "react-dom/server",
  "react-hook-form",
  "single-spa",
  "single-spa-react",
  "single-spa-canopy",

  // Utilities
  "lodash",
  "rxjs",
  /^rxjs\/?.*$/,
  "luxon",
  "moment",
  "prop-types",

  // All @canopytax modules (provided via import map)
  /^@canopytax\/[^\/]+$/,

  // Legacy SOFE pattern during transition - more explicit matching
  /^.+!sofe$/,
  // Also match specific sofe modules that might not match the regex
  (id) => id.endsWith('!sofe'),

  // Other external modules
  "@datadog/browser-rum",
  "canopy-sofe-extensions",
  "online-listener",
  "sofe",
  "cp-analytics",
];

// Helper function to check if module should be external
function createExternalFunction(externals) {
  return function isExternal(id) {
    return externals.some((external) => {
      if (external instanceof RegExp) {
        return external.test(id);
      }
      if (typeof external === 'function') {
        return external(id);
      }
      return id === external;
    });
  };
}

export default function canopyRollupConfig(name, overrides = {}, options = {}) {
  const {
    typescript = false,
    additionalExternals = [],
    port: optionsPort,
  } = options;

  if (typeof name !== "string") {
    throw new Error(
      "canopy-rollup-config expects a string name as the first argument",
    );
  }

  // Combine default externals with any additional ones
  const allExternals = [...DEFAULT_EXTERNALS, ...additionalExternals];
  
  // Handle external overrides
  const finalExternal = overrides.external 
    ? (id) => {
        // First check override external function
        const overrideResult = overrides.external(id);
        if (overrideResult === true) return true;
        // Then check default externals
        return createExternalFunction(allExternals)(id);
      }
    : createExternalFunction(allExternals);

  // Port resolution: options > command line > env > default
  const port = optionsPort || defaultPort;

  const config = {
    input: `src/${name}.${typescript ? "ts" : "js"}`,

    output: {
      dir: "build",
      format: "es", // Native ESM
      sourcemap: true,
      name: name.replace(/-([a-z])/g, (g) => g[1].toUpperCase()), // Convert kebab-case to PascalCase
      entryFileNames: `${name}.js`,
      chunkFileNames: isDev ? "[name].js" : "[name]-[hash].js",
    },

    external: finalExternal,

    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false,
        extensions: typescript
          ? [".tsx", ".ts", ".js", ".mjs"]
          : [".js", ".mjs"],
      }),

      babel({
        babelHelpers: "runtime",
        presets: [
          ["@babel/preset-env", { targets: "defaults" }],
          ["@babel/preset-react", { runtime: "automatic" }],
          ...(typescript ? [["@babel/preset-typescript"]] : []),
        ],
        plugins: ["@babel/plugin-transform-runtime"],
        extensions: typescript
          ? [".js", ".jsx", ".ts", ".tsx"]
          : [".js", ".jsx"],
        exclude: "node_modules/**",
      }),

      commonjs(),
    ],

    // Handle circular dependencies gracefully
    onwarn: (warning, warn) => {
      // Skip circular dependency warnings for now
      if (warning.code === "CIRCULAR_DEPENDENCY") return;
      warn(warning);
    },

    watch: {
      clearScreen: false,
    },
  };

  // Simple return without complex merging
  return defineConfig(config);
}
