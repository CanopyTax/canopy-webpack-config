import { defineConfig } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { babel } from "@rollup/plugin-babel";
import serve from "rollup-plugin-serve";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import livereload from "rollup-plugin-livereload";

const isDev = process.env.NODE_ENV !== "production";

// SSL cert paths
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

export default function canopyRollupConfig(name, overrides = {}, options = {}) {
  const { typescript = false, port: optionsPort } = options;
  const port = optionsPort || defaultPort;

  return defineConfig({
    input: `src/${name}.${typescript ? "ts" : "js"}`,

    output: {
      dir: "build",
      format: "es",
      sourcemap: true,
      entryFileNames: `${name}.js`,
    },

    external: [/^@canopytax\//],

    plugins: [
      nodeResolve({
        browser: true,
        preferBuiltins: false,
        extensions: [".tsx", ".ts", ".js", ".mjs"],
      }),

      babel({
        babelHelpers: "runtime",
        presets: [
          ["@babel/preset-env", { targets: "defaults" }],
          ["@babel/preset-react", { runtime: "automatic" }],
          ["@babel/preset-typescript"],
        ],
        plugins: ["@babel/plugin-transform-runtime"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        exclude: "node_modules/**",
      }),

      commonjs(),

      // Temporarily remove serve to test if watch works
      // serve({
      //   contentBase: "build",
      //   host,
      //   port,
      //   https: httpsOptions.cert && httpsOptions.key ? httpsOptions : false,
      //   headers: {
      //     "Access-Control-Allow-Origin": "*",
      //   },
      // }),
    ],
  });
}
