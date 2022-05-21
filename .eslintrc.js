module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint/eslint-plugin",
    "prettier",
    "simple-import-sort",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/no-duplicate-imports": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/method-signature-style": ["error", "method"],
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      { accessibility: "no-public" },
    ],
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "args" },
    ],
    "@typescript-eslint/naming-convention": [
      "error",
      { selector: "default", format: ["strictCamelCase"] },
      { selector: "typeLike", format: ["PascalCase"] },
      {
        selector: "variable",
        format: ["strictCamelCase", "UPPER_CASE"],
      },
      {
        selector: "parameter",
        modifiers: ["unused"],
        format: ["strictCamelCase"],
        leadingUnderscore: "allow",
      },
      { selector: "enumMember", format: ["PascalCase"] },
    ],
    "eqeqeq": "error",
    "no-promise-executor-return": "error",
    "no-self-compare": "error",
    "no-template-curly-in-string": "error",
    "no-unreachable-loop": "error",
    "arrow-body-style": "error",
    "curly": ["error", "multi", "consistent"],
    "default-case-last": "error",
    "grouped-accessor-pairs": "error",
    "no-alert": "error",
    "no-bitwise": "error",
    "no-console": "error",
    "no-else-return": "error",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-eval": "error",
    "no-extend-native": "error",
    "no-extra-label": "error",
    "no-implied-eval": "error",
    "no-label-var": "error",
    "no-negated-condition": "error",
    "no-new-wrappers": "error",
    "no-return-assign": "error",
    "no-return-await": "error",
    "no-sequences": "error",
    "no-throw-literal": "error",
    "prefer-promise-reject-errors": "error",
    "no-unneeded-ternary": "error",
    "@typescript-eslint/no-unused-expressions": "error",
    "no-useless-call": "error",
    "no-useless-escape": "error",
    "no-useless-rename": "error",
    "no-useless-return": "error",
    "no-void": "error",
    "object-shorthand": "error",
    "one-var": ["error", "never"],
    "operator-assignment": "error",
    "prefer-arrow-callback": "error",
    "prefer-exponentiation-operator": "error",
    "prefer-numeric-literals": "error",
    "prefer-object-spread": "error",
    "prefer-regex-literals": "error",
    "prefer-spread": "error",
    "require-unicode-regexp": "error",
    "max-depth": ["warn", 4],
    "max-lines": ["warn", 300],
    "max-lines-per-function": ["warn", 50],
    "complexity": ["warn", 8],
    "simple-import-sort/imports": "warn",
    "simple-import-sort/exports": "warn",
  },
  overrides: [
    {
      files: ["**/*.{spec,test}.ts"],
      rules: {
        "max-lines": "off",
        "max-lines-per-function": "off",
      },
    },
  ],
};
