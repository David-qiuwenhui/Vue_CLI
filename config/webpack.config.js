const path = require("path");
const ESLintWebpackPlugin = require("eslint-webpack-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerWebpackPlugin = require("css-minimizer-webpack-plugin");
const TerserWebpackPlugin = require("terser-webpack-plugin");
// const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
// 无损压缩的包未下载完成
// npm install imagemin-gifsicle imagemin-jpegtran imagemin-optipng imagemin-svgo -D
const CopyPlugin = require("copy-webpack-plugin");

const { VueLoaderPlugin } = require("vue-loader");
const { DefinePlugin } = require("webpack");

// Element Plus 按需导入的辅助插件
const AutoImport = require("unplugin-auto-import/webpack");
const components = require("unplugin-vue-components/webpack");
const { ElementPlusResolver } = require("unplugin-vue-components/resolvers");

// 判断当前模式
const isProduction = process.env.NODE_ENV === "production";

// serve dist 本地开启服务器访问打包构建完成的文件
const getStyleLoaders = (preProcessor) => {
    return [
        isProduction ? MiniCssExtractPlugin.loader : "vue-style-loader",
        "css-loader",
        {
            loader: "postcss-loader",
            options: {
                postcssOptions: {
                    plugins: ["postcss-preset-env"],
                },
            },
        },
        preProcessor && {
            loader: preProcessor,
            options:
                preProcessor === "sass-loader"
                    ? {
                          additionalData: `@use "@/styles/element/index.scss" as *;`,
                      }
                    : {},
        },
    ].filter(Boolean);
};

module.exports = {
    entry: "./src/main.js",
    output: {
        path: isProduction ? path.resolve(__dirname, "../dist") : undefined,
        filename: isProduction
            ? "static/js/[name].[contenthash:10].js"
            : "static/js/[name].js",
        chunkFilename: isProduction
            ? "static/js/[name].[contenthash:10].chunk.js"
            : "static/js/[name].chunk.js",
        assetModuleFilename: "static/media/[hash:10][ext][query]",
        clean: true, // 清空上一次打包的内容
    },
    module: {
        rules: [
            {
                // 处理css
                oneOf: [
                    {
                        test: /\.css$/,
                        use: getStyleLoaders(),
                    },
                    {
                        test: /\.less$/,
                        use: getStyleLoaders("less-loader"),
                    },
                    {
                        test: /\.s[sc]ss$/,
                        use: getStyleLoaders("sass-loader"),
                    },
                    {
                        test: /\.styl$/,
                        use: getStyleLoaders("stylus-loader"),
                    },
                    {
                        test: /\.(png|jpe?g|gif|svg)$/,
                        type: "asset",
                        parser: {
                            dataUrlCondition: {
                                maxSize: 10 * 1024,
                            },
                        },
                    },
                    {
                        test: /\.(ttf|woff2?)$/,
                        type: "asset/resource",
                    },
                    {
                        test: /\.js$/,
                        include: path.resolve(__dirname, "../src"),
                        loader: "babel-loader",
                        options: {
                            cacheDirectory: true,
                            cacheCompression: false,
                        },
                    },
                ],
            },
            {
                test: /\.vue$/,
                loader: "vue-loader",
                options: {
                    // 开启缓存
                    cacheDirectory: path.resolve(
                        __dirname,
                        "../node_modules/.cache/vue-loader"
                    ),
                },
            },
        ],
    },

    plugins: [
        new ESLintWebpackPlugin({
            context: path.resolve(__dirname, "../src"),
            exclude: "node_modules",
            cache: true,
            cacheLocation: path.resolve(
                __dirname,
                "../node_modules/.cache/.eslintcache"
            ),
        }),
        new HTMLWebpackPlugin({
            template: path.resolve(__dirname, "../public/index.html"),
        }),
        isProduction &&
            new MiniCssExtractPlugin({
                filename: "static/css/[name].[contenthash:10].css",
                chunkFilename: "static/css/[name].[contenthash:10].chunk.css",
            }),
        isProduction &&
            new CopyPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, "../public"),
                        to: path.resolve(__dirname, "../dist"),
                        globOptions: {
                            ignore: ["**/index.html"], // 忽略index.html文件
                        },
                    },
                ],
            }),
        new VueLoaderPlugin(),
        // cross-env 定义的环境变量给打包工具使用
        // DefinePlugin 定义环境变量给源代码使用 从而解决Vue3页面警告的问题
        new DefinePlugin({
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
        }),
        // 按需加载element-plus
        AutoImport({
            resolvers: [ElementPlusResolver()],
        }),
        components({
            resolvers: [ElementPlusResolver({ importStyle: "sass" })], // 自定义主题 引入sass
        }),
    ].filter(Boolean),
    mode: isProduction ? "production" : "development",
    devtool: isProduction ? "source-map" : "cheap-module-source-map",
    optimization: {
        splitChunks: {
            chunks: "all",
        },
        runtimeChunk: {
            name: (entrypoint) => `runtime~${entrypoint.name}.js`,
        },
        minimize: isProduction,
        minimizer: [
            new CssMinimizerWebpackPlugin(),
            new TerserWebpackPlugin(),
            /* new ImageMinimizerPlugin({
                minimizer: {
                    implementation: ImageMinimizerPlugin.imageminGenerate,
                    options: {
                        plugins: [
                            ["gifsicle", { interlaced: true }],
                            ["jpegtran", { progressive: true }],
                            ["optipng", { optimizationLevel: 5 }],
                            [
                                "svgo",
                                {
                                    plugins: [
                                        "preset-default",
                                        "prefixIds",
                                        {
                                            name: "sortAttrs",
                                            params: {
                                                xmlnsOrder: "alphabetical",
                                            },
                                        },
                                    ],
                                },
                            ],
                        ],
                    },
                },
            }), */
        ],
        splitChunks: {
            chunks: "all",
            cacheGroups: {
                // 将node_modules中比较大的模块单独打包 从而并行加载速度更好
                elementPlus: {
                    name: "elementPlus-chunk",
                    test: /[\\/]node_modules[\\/]_?element-plus(.*)/,
                    priority: 30,
                },
                // 将Vue相关的库单独打包 减少node_modules的chunk体积
                vue: {
                    name: "vue-chunk",
                    test: /[\\/]node_modules[\\/]vue(.*)[\\/]/,
                    chunks: "initial",
                    priority: 20,
                },
                libs: {
                    name: "libs-chunk",
                    test: /[\\/]node_modules[\\/]/,
                    chunks: "initial",
                    priority: 10,
                },
            },
        },
    },
    // webpack解析模块加载选项
    resolve: {
        // 自动补全全文见拓展名
        extensions: [".vue", ".js", ".json"],
        // 配置路径别名
        alias: {
            "@": path.resolve(__dirname, "../src"),
        },
    },
    devServer: {
        host: "localhost",
        port: 3000,
        open: true,
        hot: true, // 开启HMR
        historyApiFallback: true, // 解决前端路由刷新404问题
    },
    performance: false,
};
