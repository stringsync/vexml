/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const INDEX_HTML = path.join(__dirname, 'public', 'index.html');
const EXAMPLES_DIR = path.join(__dirname, 'public', 'examples');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src', 'index.tsx'),
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'),
      publicPath: '/public',
    },
    hot: true,
    onAfterSetupMiddleware: (devServer) => {
      devServer.app.get('/manifest', async (req, res) => {
        const examples = fs.readdirSync(EXAMPLES_DIR).sort();
        res.json({ examples });
      });

      devServer.app.get('*', async (req, res) => {
        res.sendFile(INDEX_HTML);
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
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    // Hack to fix bug https://github.com/facebook/react/issues/13991#issuecomment-435587809
    alias: {
      react: path.resolve('./node_modules/react'),
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
};
