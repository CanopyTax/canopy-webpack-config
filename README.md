# canopy-webpack-config
Some defaults for webpack configs at Canopy.

## Motivation
Keeping the webpack externals consistent across projects can be tricky. And maybe some other things.

## Goals
- Ensure webpack externals for common dependencies are correct. This ensures smaller bundle sizes.
- Provide some defaults for people implementing sofe services.
- Still be 100% overrideable.

## Things we don't want
- Hiding webpack configs to the CRA or angular-cli level. Nothing will need to be "ejected".
- Discouraging people from experimenting with their webpack config.
- Discouraging people from knowing webpack.
- Being overly opininated about how you do things like css (or other "autonomy" areas of building a sofe service).

## Usage
Create `webpack.config.js` file. Then create a `"build": "webpack --config webpack.config.js"` script in your package.json.
In your webpack.config.js file, call the `canopyWebpackConfig()` function to get some defaults and add/override to your webpack
config.

```bash
yarn add --dev canopy-webpack-config
```

```js
const canopyWebpackConfig = require('canopy-webpack-config');

module.exports = canopyWebpackConfig('login-ui', {
  // Override or add anything you want to your webpack config
  module: {
    rules: [
      { loader: 'css-loader' },
    ],
  },
})
```

## API
- `canopyWebpackConfig(name, config)`: The default export of the canopy-webpack-config npm library. This function requires both of its arguments.
  The first argument is a string name for the library you are exporting. The second is a webpack config that will be merged with the defaults that
  canopy-webpack-config provides. The library will put the bundled files into the "build" directory. Note that this project assumes that you use
  babel-loader, but it does not install babel-loader. So you'll have to install it yourself, at whatever version you prefer.
