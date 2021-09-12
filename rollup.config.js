import { defineConfig } from 'rollup';
import {version} from "./package.json";

import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import clear from 'rollup-plugin-clear';
import copy from 'rollup-plugin-copy';
import execute from 'rollup-plugin-execute';

export default defineConfig ({
    input: 'main.js',
    output: {
        file: 'publish/temp/index.js',
        format: 'cjs',
        exports:"named"
    },
    plugins: [
        json(),
        commonjs(),
        generatePackageJson({
            baseContents: (pkg) => ({
            name: pkg.name,
            version: pkg.version,
            dependencies: {},
            private: true
            })
        }),
        clear({
            targets: ['publish']
        }),
        copy({
            targets: [
              { src: 'credentials/google-key.json', dest: 'publish/temp/credentials' }
            ]
          }),
        execute("cd publish/temp; sleep 0.1; zip -r ../GNFunc_v" + version.replace(".","-").replace(/\./g,"") + ".zip ./*; cd ..;sleep 0.1; rm -r ./temp")
    ]
  });