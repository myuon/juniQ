var path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    live2dcubismframework: './cubism-js/src/live2dcubismframework.ts',
    live2dcubismpixi: './cubism-js/src/live2dcubismpixi.ts',
    viewer: './src/viewer.ts',
    index: './src/index.ts',
  },
  devtool: 'source-map',
  
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.ts$/,
        use: [
          {
            loader: 'babel-loader',
            options: { presets: ["env"] }
          },
          {
            loader: 'ts-loader',
          }
        ]
      },
    ],
  },

  resolve: {
    modules: [ 'src', 'node_modules' ],
    extensions: [ '.ts', '.js' ]
  },
};