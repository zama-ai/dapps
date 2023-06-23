const CopyPlugin = require('copy-webpack-plugin');

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
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
