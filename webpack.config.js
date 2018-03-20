const webpack = require("webpack");
const path = require('path');
let HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    devServer: {
        host: process.env.MG_SERVER_HOST,
        port: process.env.MG_SERVER_PORT,
        disableHostCheck: true
    },

    devtool: 'source-map',

    entry: [ './src/main-dev.js' ],

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: (process.env.MG_ENV === 'dev') ? "mg.debug.js" : "mg.[hash].min.js"
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/assets/html/index.html',
            minify: {
                collapseWhitespace: true,
                preserveLineBreaks: true
            }
        }),
    ],
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    presets: ['es2017']
                }
            },
            {
                test: /\.glsl$/,
                loader: 'webpack-glsl'
            },
            {
                test: /\.html$/,
                loader: "html-loader",
                options: {
                    interpolate: true
                }
            },
            {
                test: /\.scss/,
                loaders: [
                    'style-loader',
                    'css-loader?importLoaders=1',
                    'postcss-loader',
                    'sass-loader'
                ]
            },
        ]
    }
};