const path = require('path');

module.exports = {
  mode: 'development',
  entry: './index.ts',
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
    filename: 'vexml.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Vexml',
    globalObject: 'this',
    libraryTarget: 'umd',
    libraryExport: 'default',
  },
};