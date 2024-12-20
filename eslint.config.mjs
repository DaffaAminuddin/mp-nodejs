import globals from 'globals';
import pluginJs from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  pluginJs.configs.recommended,
  {
    rules: {
      "no-unused-vars": "off", // Pastikan aturan ini ditimpa terakhir
      "no-unused-labels" : "off",
      "no-extra-boolean-cast" : "off",
      "no-prototype-builtins" : "off",
      "no-undef" : "off",
      "no-cond-assign" : "off"
    },
  },
];
