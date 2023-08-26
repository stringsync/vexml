/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const INDEX_HTML = path.join(__dirname, 'public', 'index.html');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SNAPSHOTS_DIR = path.join(__dirname, 'public', 'snapshots');
const EXAMPLES_DIR = path.join(PUBLIC_DIR, 'examples');
const SNAPSHOT_STORAGE = multer.diskStorage({
  destination: SNAPSHOTS_DIR,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'src', 'index.tsx'),
  devtool: 'inline-source-map',
  devServer: {
    static: {
      directory: PUBLIC_DIR,
      publicPath: '/public',
      watch: false,
    },
    allowedHosts: 'all',
    hot: true,
    setupMiddlewares: (middlewares, devServer) => {
      devServer.app.post(
        '/snapshot',
        multer({
          storage: SNAPSHOT_STORAGE,
        }).single('image')
      );

      middlewares.push({
        path: '/manifest',
        middleware: (req, res) => {
          const examples = fs.readdirSync(EXAMPLES_DIR).sort();
          res.json({ examples });
        },
      });

      middlewares.push((req, res) => {
        res.sendFile(INDEX_HTML);
      });

      return middlewares;
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
    path: PUBLIC_DIR,
  },
};
