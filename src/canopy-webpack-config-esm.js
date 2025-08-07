const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { merge } = require("webpack-merge");
const fs = require("fs");
const { homedir } = require("os");

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

module.exports = function (name, overridesConfig = {}, options = {}) {
  const { typescript, externals } = options;
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
      "canopy-webpack-config-esm expects an object as a second argument to override the canopy defaults. Received " +
        typeof overridesConfig,
    );
  }

  return function (env) {
    if (!env) {
      env = {};
    }

    const defaultCanopyConfig = {
      mode: env.NODE_ENV || "development",
      context: process.cwd(),
      entry: typescript ? `./src/${name}.ts` : `./src/${name}.js`,

      // ESM output configuration
      output: {
        filename: `${name}.js`,
        path: path.resolve(process.cwd(), "build"),
        library: {
          type: "module", // Output as ES module
        },
        environment: {
          module: true, // Enable module syntax in output
        },
        chunkFormat: "module", // Use ES module format for chunks
      },

      experiments: {
        outputModule: true, // Enable ES module output
      },

      // External dependencies for microfrontend architecture (copied from original webpack config)
      externals: externals || [
        /^.+!sofe$/,
        /^canopy-sofe-extensions$/,
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
        /^rx$/,
        /^rxjs\/?.*$/,
        /^single-spa-canopy$/,
        /^single-spa-react$/,
        /^single-spa$/,
        /^react-hook-form$/,
        /^@datadog\/browser-rum$/,
        /^cp-client-auth$/,
        /^sofe$/,
        /^cp-analytics$/,
        /^@canopytax\/.+$/,
      ],

      resolve: {
        fullySpecified: false,
        extensions: typescript
          ? [".tsx", ".ts", ".js", ".jsx", ".json"]
          : [".js", ".jsx", ".json"],
        modules: [process.cwd(), "node_modules"], // Allow imports like "src/utils"
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
                    {
                      targets: "defaults",
                      modules: false, // Keep ES modules for webpack
                    },
                  ],
                  [
                    "@babel/preset-react",
                    {
                      runtime: "automatic", // Use new JSX transform
                    },
                  ],
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
          new BundleAnalyzerPlugin({
            analyzerMode: "server",
          }),
        env.analyze === "static" &&
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
            openAnalyzer: false,
          }),
      ].filter(Boolean),

      devtool: env.NODE_ENV === "production" ? "source-map" : "eval-source-map",

      devServer: isDevServer
        ? {
            host,
            port,
            https: (() => {
              const sslPath = path.join(homedir(), ".canopy-ssl");
              const keyPath = path.join(sslPath, "key.pem");
              const certPath = path.join(sslPath, "public.pem");

              if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
                return {
                  key: fs.readFileSync(keyPath),
                  cert: fs.readFileSync(certPath),
                };
              }
              return false;
            })(),
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, PATCH, OPTIONS",
              "Access-Control-Allow-Headers":
                "X-Requested-With, content-type, Authorization",
            },
            allowedHosts: "all",
            hot: false, // HMR not supported with ESM output format
            liveReload: true, // Keep live reload for page refresh
          }
        : undefined,
    };

    if (typeof overridesConfig === "function") {
      return overridesConfig(defaultCanopyConfig, env);
    } else {
      return merge(defaultCanopyConfig, overridesConfig);
    }
  };
};
