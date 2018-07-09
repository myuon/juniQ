var path = require('path');

module.exports = {
  mode: 'development',
  entry: {
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