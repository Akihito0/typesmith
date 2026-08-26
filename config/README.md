# config/

Tooling configuration that does not have to sit at the repo root.

| File                   | Wired up by                                              |
| ---------------------- | -------------------------------------------------------- |
| `tailwind.config.ts`   | `postcss.config.mjs` (`tailwindcss: { config: ... }`)    |
| `vitest.config.ts`     | the `test*` npm scripts (`--config`)                     |
| `playwright.config.ts` | the `test:e2e*` / `test:visual` npm scripts (`--config`) |
| `.prettierrc.json`     | the `format*` npm scripts (`--config`)                   |
| `.prettierignore`      | the `format*` npm scripts (`--ignore-path`)              |

Two things to know before editing:

- **Paths inside `vitest.config.ts` and `playwright.config.ts` resolve from
  this folder**, not the repo root. Both anchor themselves to the root
  explicitly — Playwright also pins `outputDir`, the HTML report folder, and
  `webServer.cwd`, because CI uploads `playwright-report/` from the root.
  Tailwind's `content` globs are the exception: those resolve from the working
  directory, which is always the repo root via npm scripts.
- **Prettier's `--ignore-path` defaults to `[.gitignore, .prettierignore]`.**
  Naming one replaces the whole list, so the `format` scripts pass `.gitignore`
  as well; drop it and Prettier starts checking build output.

`.vscode/settings.json` points the Prettier and Tailwind extensions here so
format-on-save and class autocomplete keep working.

## What has to stay at the repo root

Not stubbornness — these are the only places their tools look:

| File                                | Why                                                |
| ----------------------------------- | -------------------------------------------------- |
| `next.config.mjs`, `next-env.d.ts`  | Next.js reads them from the project root           |
| `postcss.config.mjs`                | Next.js resolves PostCSS config from the root only |
| `tsconfig.json`                     | `tsc`, Next.js, and every editor expect it there   |
| `.eslintrc.json`                    | `next lint` has no flag to point ESLint elsewhere  |
| `.editorconfig`, `.gitignore`       | resolved by walking up from each file              |
| `package.json`, `README`, `LICENSE` | npm and GitHub convention                          |
