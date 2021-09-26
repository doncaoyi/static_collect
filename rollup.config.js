// rollup.config.js
import babel from 'rollup-plugin-babel';
import {uglify} from 'rollup-plugin-uglify';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';

export default {
    // 核心选项
    input: './index.js',     // 必须
    output: {
        file: 'dist/bundle.js',
        format: 'cjs'
    },
    plugins: [
        resolve({
            customResolveOptions: {
                moduleDirectory: [
                    'node_modules',
                    'dist',
                ],
            },
            browser: true
        }),
        json(),
        commonjs(),
        babel({exclude: 'node_modules/**'}),
        uglify()
    ],
};