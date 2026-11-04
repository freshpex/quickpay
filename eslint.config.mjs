import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "**/.next/**",
      "**/.next-qa/**",
      "**/node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "apps/mobile/.expo/**",
      "apps/mobile/dist/**",
      "apps/mobile/android/**",
      "apps/mobile/ios/**",
      ".local/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["apps/mobile/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        File: "readonly",
        crypto: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        IntersectionObserver: "readonly",
        HTMLVideoElement: "readonly",
        AbortSignal: "readonly",
        AbortController: "readonly",
        __DEV__: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
