/* eslint-env node */
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const merge = require('webpack-merge')

module.exports = function(name, overridesConfig) {
  if (typeof name !== 'string') {
    throw new Error('canopy-webpack-config expects a string name as the first argument')
  }

  if (typeof overridesConfig !== 'object') {
    throw new Error('canopy-webpack-config expects an object as a second argument to override the canopy defaults. Received ' + typeof overridesConfig)
  }

  const defaultCanopyConfig = {
    entry: `./src/${name}.js`,
    output: {
      filename: `${name}.js`,
      library: name,
      libraryTarget: 'amd',
      path: path.resolve(process.cwd(), 'sofe'),
      chunkFilename: '[name].js',
    },
    mode: 'production',
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
      new CleanWebpackPlugin(['sofe']),
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

  return merge.smart(defaultCanopyConfig, overridesConfig);
}
