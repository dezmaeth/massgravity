const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    devServer: {
        host: process.env.MG_SERVER_HOST,
        port: process.env.MG_SERVER_PORT,
        allowedHosts: 'all',
    },

    devtool: 'source-map',

    entry: './src/main-dev.js',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: (process.env.MG_ENV === 'dev') ? "mg.debug.js" : "mg.[contenthash].min.js"
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
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'] // updated preset name
                    }
                }
            },
            {
                test: /\.glsl$/,
                use: 'webpack-glsl-loader' // if 'webpack-glsl' doesn't work, it might be named 'webpack-glsl-loader'. Please check.
            },
            {
                test: /\.html$/,
                use: {
                    loader: "html-loader",
                    options: {
                        interpolate: true
                    }
                }
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: { importLoaders: 1 }
                    },
                    'postcss-loader',
                    'sass-loader'
                ]
            },
        ]
    }
};
