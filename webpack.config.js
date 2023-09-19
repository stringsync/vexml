/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.ts'),
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
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'vexml.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
