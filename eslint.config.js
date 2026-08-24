const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    settings: {
      "import/resolver": {
        typescript: {
          extensions: [
            ".ios.ts",
            ".ios.tsx",
            ".android.ts",
            ".android.tsx",
            ".native.ts",
            ".native.tsx",
            ".ts",
            ".tsx",
            ".d.ts",
            ".js",
            ".jsx",
            ".json",
          ],
        },
      },
    },
  },
]);
