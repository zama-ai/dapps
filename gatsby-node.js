const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      fallback: {
        'tfhe_bg.wasm': require.resolve('tfhe/tfhe_bg.wasm'),
        buffer: require.resolve('buffer/'),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new CopyPlugin({
        patterns: [
          {
            from: 'node_modules/fhevmjs/bundle/*',
            to: 'static/[name][ext]',
          },
        ],
      }),
    ],
  });
};
