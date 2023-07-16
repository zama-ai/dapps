const CopyPlugin = require('copy-webpack-plugin');

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      fallback: {
        'tfhe_bg.wasm': require.resolve('tfhe/tfhe_bg.wasm'),
      },
    },
    plugins: [
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
