var path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/tsc/main.ts',
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
