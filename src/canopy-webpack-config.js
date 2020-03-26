const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const merge = require('webpack-merge')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const {UnusedFilesWebpackPlugin} = require('unused-files-webpack-plugin')
const fs = require("fs")
const homedir = require("os").homedir()

let isDevServer = false

if (process.argv.some(arg => arg.includes('webpack-dev-server'))) {
  isDevServer = true
}

const hostIndex = process.argv.findIndex(arg => arg === "--host")
const host = hostIndex >= 0 && process.argv[hostIndex + 1] ? process.argv[hostIndex + 1] : "0.0.0.0"

const portIndex = process.argv.findIndex(arg => arg === "--port")
const port = portIndex >= 0 && process.argv[portIndex + 1] ? process.argv[portIndex + 1] : "8080"

module.exports = function(name, overridesConfig) {
  if (typeof name !== 'string') {
    throw new Error('canopy-webpack-config expects a string name as the first argument')
  }

  if (typeof overridesConfig !== 'object' && typeof overridesConfig !== 'function') {
    throw new Error('canopy-webpack-config expects an object as a second argument to override the canopy defaults. Received ' + typeof overridesConfig)
  }

  return function(env) {
    if (!env) {
      env = {}
    }

    const defaultCanopyConfig = {
      entry: `./src/${name}.js`,
      output: {
        filename: `${name}.js`,
        jsonpFunction: "wpjsonp-"+name,
        libraryTarget: 'amd',
        path: path.resolve(process.cwd(), 'build'),
        chunkFilename: '[name].js',
      },
      mode: env.dev || isDevServer ? 'development' : 'production',
      module: {
        rules: [
          {
            test: /\.js?$/,
            exclude: [path.resolve(process.cwd(), 'node_modules')],
            loader: 'babel-loader',
            options: {
              plugins: [
                // https://github.com/babel/babel-loader#babel-is-injecting-helpers-into-each-file-and-bloating-my-code
                "@babel/plugin-transform-runtime",
              ],
            },
          },
          // https://github.com/systemjs/systemjs#compatibility-with-webpack
          {
            parser: {
              system: false,
            },
          },
        ],
      },
      resolve: {
        modules: [
          process.cwd(),
          'node_modules',
        ],
      },
      plugins: [
        new CleanWebpackPlugin({ verbose: isDevServer, }),
        new BundleAnalyzerPlugin({
          analyzerMode: env.analyze || 'disabled',
        }),
        new UnusedFilesWebpackPlugin({
          globOptions: {
            cwd: path.resolve(process.cwd(), 'src'),
            ignore: [
              "**/*.test.js",
              "**/*.spec.js",
              "**/*.js.snap",
              "**/test-setup.js",
              "**/.stories.js"
            ],
          }
        }),
      ],
      devtool: 'source-map',
      externals: [
        /^.+!sofe$/,
        /^canopy-sofe-extensions$/,
        /^lodash$/,
        /^moment$/,
        /^online-listener$/,
        /^prop-types$/,
        /^react-dom$/,
        /.*react-dom.*/,
        /^react\/lib.*/,
        /^react$/,
        /^rx$/,
        /^rxjs\/?.*$/,
        /^single-spa-canopy$/,
        /^single-spa$/,
        /^sofe$/,
        /^cp-analytics$/,
      ],
      devServer: isDevServer ? {
        host: host,
        https: {
          cert: fs.readFileSync(`${homedir}/.canopy-ssl/public.pem`),
          key: fs.readFileSync(`${homedir}/.canopy-ssl/key.pem`)
        },
        disableHostCheck: true,
        sockHost: host === "0.0.0.0" ? "localhost" : host, // Use localhost for the socket connection for CSP purposes
        sockPort: port,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
      } : {}
    };

    overridesConfig = typeof overridesConfig === 'function' ? overridesConfig(env) : overridesConfig

    const finalConfig = merge.smart(defaultCanopyConfig, overridesConfig)

    if (env.debug) {
      console.log(finalConfig)
    }

    return finalConfig
  }
}
