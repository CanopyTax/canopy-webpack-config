const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const merge = require("webpack-merge");
const fs = require("fs");
const homedir = require("os").homedir();

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
      "canopy-webpack-config expects a string name as the first argument"
    );
  }

  if (
    typeof overridesConfig !== "object" &&
    typeof overridesConfig !== "function"
  ) {
    throw new Error(
      "canopy-webpack-config expects an object as a second argument to override the canopy defaults. Received " +
        typeof overridesConfig
    );
  }

  return function (env) {
    if (!env) {
      env = {};
    }

    const defaultCanopyConfig = {
      entry: {
        [name]: `./src/${name}.${typescript ? "ts" : "js"}`,
        ...(externals && {
          externals: `./src/externals.${typescript ? "ts" : "js"}`,
        }),
      },
      output: {
        filename: (pathData) => `${pathData.chunk.name}.js`,
        publicPath: "",
        uniqueName: name,
        library: {
          type: "amd",
          name: name,
        },
        path: path.resolve(process.cwd(), "build"),
        chunkFilename: "[name].js",
      },
      mode: env.dev || isDevServer ? "development" : "production",
      module: {
        rules: [
          {
            test: typescript ? /\.(tsx|ts|m?js)?$/ : /\.m?js$/,
            exclude: [path.resolve(process.cwd(), "node_modules")],
            loader: "babel-loader",
            options: {
              plugins: [
                // https://github.com/babel/babel-loader#babel-is-injecting-helpers-into-each-file-and-bloating-my-code
                "@babel/plugin-transform-runtime",
              ],
            },
          },
        ],
      },
      resolve: {
        ...(typescript
          ? {
              extensions: [".tsx", ".ts", ".js", ".mjs"],
            }
          : {}),
        modules: [process.cwd(), "node_modules"],
        fallback: {
          url: require.resolve("url/"),
          "react/jsx-runtime": "react/jsx-runtime.js",
          "react/jsx-dev-runtime": "react/jsx-dev-runtime.js",
        },
      },
      plugins: [
        new CleanWebpackPlugin({ verbose: isDevServer }),
        new BundleAnalyzerPlugin({
          analyzerMode: env.analyze || "disabled",
        }),
      ],
      devtool: "source-map",
      externals: [
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
        /^single-spa$/,
        /^sofe$/,
        /^cp-analytics$/,
        /^react-hook-form$/,
      ],

      devServer: isDevServer
        ? {
            host: host,
            server: {
              type: "https",
              options: {
                cert: fs.readFileSync(`${homedir}/.canopy-ssl/public.pem`),
                key: fs.readFileSync(`${homedir}/.canopy-ssl/key.pem`),
              },
            },
            allowedHosts: "all",
            client: {
              webSocketURL: {
                hostname: host === "0.0.0.0" ? "localhost" : host, // Use localhost for the socket connection for CSP purposes
                port: port,
              },
            },
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          }
        : {},
    };

    overridesConfig =
      typeof overridesConfig === "function"
        ? overridesConfig(env)
        : overridesConfig;

    const finalConfig = merge.smart(defaultCanopyConfig, overridesConfig);

    if (env.debug) {
      console.log(finalConfig);
    }

    return finalConfig;
  };
};
