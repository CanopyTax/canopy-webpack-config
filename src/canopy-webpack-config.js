const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const merge = require('webpack-merge')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const {UnusedFilesWebpackPlugin} = require('unused-files-webpack-plugin')

let isDevServer = false

if (process.argv.some(arg => arg.includes('webpack-dev-server'))) {
  isDevServer = true
}

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
        library: name,
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
        new CleanWebpackPlugin(['build']),
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
            ],
          }
        }),
      ],
      devtool: 'source-map',
      externals: [
        /^.+!sofe$/,
        /^lodash$/,
        /^rxws$/,
        /^moment$/,
        /^react$/,
        /^react\/lib.*/,
        /^react-dom$/,
        /.*react-dom.*/,
        /^rx$/,
        /^rxjs\/?.*$/,
        /^rxws$/,
        /^sofe$/,
        /^single-spa$/,
        /^single-spa-canopy$/,
        /^prop-types$/,
        /^canopy-sofe-extensions$/,
      ],
    };

    overridesConfig = typeof overridesConfig === 'function' ? overridesConfig(env) : overridesConfig

    const finalConfig = merge.smart(defaultCanopyConfig, overridesConfig)

    if (env.debug) {
      console.log(finalConfig)
    }

    return finalConfig
  }
}
