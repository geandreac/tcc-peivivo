// ESLint (flat config) do monorepo: TypeScript em todos os pacotes; hooks e
// acessibilidade (jsx-a11y) no apps/web. Roda da raiz (`npm run lint`) ou de
// qualquer workspace (o ESLint sobe até achar este arquivo).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "**/playwright-report/**", "**/test-results/**", "supabase/functions/_shared/gerado/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `_` marca parâmetro/variável ignorado de propósito (ex.: desestruturação para omitir props)
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  { files: ["apps/web/**/*.tsx"], ...jsxA11y.flatConfigs.recommended },
  {
    files: ["apps/web/**/*.tsx"],
    rules: {
      // o rótulo envolve o input e o texto fica em <span> aninhado (.opcao__texto): a regra precisa olhar 3 níveis
      "jsx-a11y/label-has-associated-control": ["error", { depth: 3 }],
      // região com rolagem precisa de foco por teclado (WCAG 2.1.1; axe: scrollable-region-focusable)
      "jsx-a11y/no-noninteractive-tabindex": ["error", { roles: ["region", "tabpanel"], tags: ["pre"] }],
    },
  },
  { files: ["scripts/**/*.{js,mjs}", "**/*.config.{js,ts}", "packages/**/*.ts"], languageOptions: { globals: globals.node } },
  { files: ["supabase/functions/**/*.ts"], languageOptions: { globals: { Deno: "readonly" } } },
);
