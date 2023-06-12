const CopyPlugin = require('copy-webpack-plugin');

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: 'node_modules/zama-web3/bundle/*',
            to: 'static/[name][ext]',
          },
        ],
      }),
    ],
    // experiments: {
    //   asyncWebAssembly: true,
    //   syncWebAssembly: true,
    // },
    // resolve: {
    //   fallback: {
    //     buffer: require.resolve('buffer/'),
    //     crypto: require.resolve('crypto-browserify'),
    //     stream: require.resolve('stream-browserify'),
    //     path: require.resolve('path-browserify'),
    //   },
    // },
  });
};
