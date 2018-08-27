const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const merge = require('webpack-merge')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

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
      mode: env.dev ? 'development' : 'production',
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

    if (env.analyze) {
      defaultCanopyConfig.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerPort: 1212
        })
      )
    }

    overridesConfig = typeof overridesConfig === 'function' ? overridesConfig(env) : overridesConfig

    return merge.smart(defaultCanopyConfig, overridesConfig);
  }
}
