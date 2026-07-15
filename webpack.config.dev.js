const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    liveReload: true,
    hot: true,
    open: true,
    host: 'localhost',
    port: 3000,
    static: ['./'],
    // Forward API calls to the Express auth server (npm run server).
    proxy: [{ context: ['/api'], target: 'http://localhost:3001' }],
  },
});
