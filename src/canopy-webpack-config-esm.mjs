import path from "path";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import merge from "webpack-merge";
import fs from "fs";
import { homedir } from "os";

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
  /^online-listener$/,
  /^prop-types$/,
  /^react-dom$/,
  /^react-dom\/client$/,
  /^react-dom\/server$/,
  /^react\/lib.*/,
  /^react$/,
  /^rxjs\/?.*$/,
  /^single-spa-canopy$/,
  /^single-spa$/,
  /^@canopytax\/[^\/]+$/,
  /^react-hook-form$/,
  /^react-router-dom-v6$/,
];

export default function (name, overridesConfig = {}, options = {}) {
  const { typescript, externals: hasExternals } = options;

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

  return function (env = {}) {
    const defaultCanopyConfig = {
      mode: env.dev || isDevServer ? "development" : "production",
      context: process.cwd(),

      // Modern ESM-friendly output
      target: ["web", "es2020"],

      entry: {
        [name]: `./src/${name}.${typescript ? "ts" : "js"}`,
        ...(hasExternals && {
          [`${name}-externals`]: `./src/externals.${typescript ? "ts" : "js"}`,
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
        path: path.resolve(process.cwd(), "build"),
        publicPath: "auto", // resolve chunks relative to the loaded entry URL
        library: { type: "module" }, // emit as native ESM
        environment: { module: true },
        chunkFormat: "module",
      },

      experiments: {
        outputModule: true,
      },

      optimization: {
        runtimeChunk: false,
        splitChunks: { chunks: "async" },
        minimize: false,
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
        extensions: typescript
          ? [".tsx", ".ts", ".js", ".jsx", ".json"]
          : [".js", ".jsx", ".json"],
        modules: [process.cwd(), "node_modules"],
      },

      module: {
        rules: [
          {
            test: /\.(js|jsx|ts|tsx)$/,
            exclude: /node_modules/,
            use: {
              loader: "babel-loader",
              options: {
                presets: [
                  [
                    "@babel/preset-env",
                    { targets: "defaults", modules: false },
                  ],
                  ["@babel/preset-react", { runtime: "automatic" }],
                  ...(typescript ? [["@babel/preset-typescript"]] : []),
                ],
                plugins: ["@babel/plugin-transform-runtime"],
              },
            },
          },
        ],
      },

      plugins: [
        new CleanWebpackPlugin({
          cleanOnceBeforeBuildPatterns: ["**/*", "!.gitkeep"],
        }),
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
            server: (() => {
              const sslPath = path.join(homedir(), ".canopy-ssl");
              const keyPath = path.join(sslPath, "key.pem");
              const certPath = path.join(sslPath, "public.pem");

              if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
                return {
                  type: "https",
                  options: {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath),
                    // http2: true, // optional
                  },
                };
              }
              return { type: "http" };
            })(),
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
            liveReload: false,
            client: false,
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
