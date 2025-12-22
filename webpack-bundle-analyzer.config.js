/**
 * Webpack Bundle Analyzer Konfiguration
 * Detaillierte Bundle-Analyse für Performance-Optimierung
 */

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');

module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
      statsFilename: 'bundle-stats.json',
      generateStatsFile: true,
      statsOptions: {
        performance: true,
        optimizationBailout: true,
        orphanModules: true,
        depth: null,
        exclude: /node_modules/
      },
      excludeAssets: {
        filter: (assetName) => {
          return !/\.(js|css)$/.test(assetName) || assetName.includes('map');
        }
      }
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource'
      }
    ]
  }
};