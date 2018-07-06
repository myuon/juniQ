module.exports = {
    // モード値を production に設定すると最適化された状態で、
    // development に設定するとソースマップ有効でJSファイルが出力される
    mode: 'development',
   
    // メインとなるJavaScriptファイル（エントリーポイント）
    entry: './src/tsc/main.ts',
   
    module: {
      rules: [
        {
          // 拡張子 .ts の場合
          test: /\.ts$/,
          // TypeScript をコンパイルする
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    // import 文で .ts ファイルを解決するため
    resolve: {
      extensions: [
        '.ts'
      ]
    }
  };
