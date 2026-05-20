import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["src-tauri/", "dist/", "node_modules/"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Relax some rules for debug-only code
    files: ["src/dev/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
