import path from "path";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import merge from "webpack-merge";
import fs from "fs";
import os from "os";
import { tailwindSupport } from "./tailwind/index.js";

const homedir = os.homedir();

let isDevServer = false;
if (process.argv.some((arg) => arg.includes("serve"))) {
  isDevServer = true;
}

const hostIndex = process.argv.findIndex((arg) => arg === "--host");
const host =
  hostIndex >= 0 && process.argv[hostIndex + 1]
    ? process.argv[hostIndex + 1]
    : "0.0.0.0";

const portIndex = process.argv.findIndex((arg) => arg === "--port");
const port =
  portIndex >= 0 && process.argv[portIndex + 1]
    ? process.argv[portIndex + 1]
    : "8080";

// --- Externals matching helpers ---
const externalPatterns = [
  /^lodash$/,
  /^moment$/,
  /^luxon$/,
  /^prop-types$/,
  /^react-dom$/,
  /^react-dom\/client$/,
  /^react-dom\/server$/,
  /^react\/lib.*/,
  /^react$/,
  /^rxjs\/?.*$/,
  // Built out of the common-dependencies repo rather than npm. They keep their bare
  // specifiers under ESM, same as under SystemJS, so consuming source needs no edit —
  // online-listener in particular owns a singleton observable that must not be duplicated.
  /^online-listener$/,
  /^cp-analytics$/,
  /^single-spa-canopy$/,
  /^single-spa$/,
  /^@canopytax\//,
  /^react-hook-form$/,
  /^react-router-dom-v6$/,
];

export default function (name, overridesConfig = {}, options = {}) {
  const { externals: hasExternals, tailwind } = options;

  if (typeof name !== "string") {
    throw new Error(
      "canopy-webpack-config-esm expects a string name as the first argument",
    );
  }
  if (
    typeof overridesConfig !== "object" &&
    typeof overridesConfig !== "function"
  ) {
    throw new Error(
      "canopy-webpack-config-esm expects an object as overrides. Received " +
        typeof overridesConfig,
    );
  }

  const {
    rules: tailwindRules,
    plugins: tailwindPlugins,
    alias: tailwindAlias,
  } = tailwindSupport(tailwind);

  return function (env = {}) {
    const defaultCanopyConfig = {
      mode: env.dev || isDevServer ? "development" : "production",
      context: process.cwd(),

      // Modern ESM-friendly output
      target: ["web", "es2020"],

      entry: {
        [name]: `./src/${name}.ts`,
        ...(hasExternals && {
          [`${name}-externals`]: `./src/externals.ts`,
        }),
      },

      // ESM output configuration
      output: {
        filename: (pathData) =>
          pathData.chunk.name === `${name}-externals`
            ? `${name}-externals.js`
            : `${pathData.chunk.name}.js`,
        chunkFilename: "[name].js", // predictable ESM chunk names
        chunkLoading: "import", // load chunks via `import()`
        path: path.resolve(process.cwd(), "build-esm"),
        publicPath: "auto", // resolve chunks relative to the loaded entry URL
        library: { type: "module" }, // emit as native ESM
        environment: { module: true },
        chunkFormat: "module",
        devtoolNamespace: name,
        devtoolModuleFilenameTemplate: "webpack://[namespace]/[resource-path]",
      },

      experiments: {
        outputModule: true,
      },

      optimization: {
        runtimeChunk: false,
        splitChunks: { chunks: "async" },
      },

      externalsType: "module",
      externals: [
        function (data, callback) {
          const { request } = data;
          if (externalPatterns.some((re) => re.test(request))) {
            return callback(null, `module ${request}`);
          }
          return callback();
        },
      ],

      resolve: {
        fullySpecified: false,
        extensions: [".tsx", ".ts", ".js", ".jsx", ".json"],
        modules: [process.cwd(), "node_modules"],
        alias: tailwindAlias,
      },

      module: {
        rules: [
          {
            test: /\.(js|jsx|ts|tsx)$/,
            exclude: /node_modules/,
            use: "babel-loader",
          },
          ...tailwindRules,
        ],
      },

      plugins: [
        new CleanWebpackPlugin({
          cleanOnceBeforeBuildPatterns: ["**/*", "!.gitkeep"],
        }),
        ...tailwindPlugins,
        env.analyze === "server" &&
          new BundleAnalyzerPlugin({ analyzerMode: "server" }),
        env.analyze === "static" &&
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
            openAnalyzer: false,
          }),
      ].filter(Boolean),

      devtool: "source-map",

      devServer: isDevServer
        ? {
            host,
            port,
            server: {
              type: "https",
              options: {
                cert: fs.readFileSync(`${homedir}/.canopy-ssl/public.pem`),
                key: fs.readFileSync(`${homedir}/.canopy-ssl/key.pem`),
              },
            },
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, PATCH, OPTIONS",
              "Access-Control-Allow-Headers":
                "X-Requested-With, content-type, Authorization",
              "Access-Control-Allow-Private-Network": "true",
            },
            allowedHosts: "all",
            hot: false,
            liveReload: true,
            client: {
              webSocketURL: {
                protocol: "wss",
                hostname: host === "0.0.0.0" ? "localhost" : host, // Use localhost for the socket connection for CSP purposes
                port,
              },
            },
          }
        : undefined,
    };

    if (typeof overridesConfig === "function") {
      return overridesConfig(defaultCanopyConfig, env);
    } else {
      return merge(defaultCanopyConfig, overridesConfig);
    }
  };
}
