/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const EXAMPLES_DIR = path.join(__dirname, 'public', 'examples');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src', 'index.ts'),
  devtool: 'inline-source-map',
  devServer: {
    static: path.resolve(__dirname, 'public'),
    hot: true,
    onAfterSetupMiddleware: (devServer) => {
      devServer.app.get('/manifest', (req, res) => {
        const examples = fs.readdirSync(EXAMPLES_DIR);
        res.json({ examples });
      });
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
};
