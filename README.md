# Truth Table Generator

An interactive Angular website for generating complete truth tables from Boolean expressions. The project also retains the original Python and C++ implementations that inspired the web version.

The teaching view includes a color-coded parse tree, selectable truth-table rows, step-by-step evaluation, expression statistics, Boolean classification, CSV/clipboard export, and shareable expression URLs.

The live website is available at:

**https://soumikbhattacharjee31.github.io/Truth-Table-Generator/**

## Expression syntax

Variables are case-sensitive single letters. Whitespace is optional.

| Symbol | Operation   | Example            |
| ------ | ----------- | ------------------ |
| `+`    | OR          | `A + B`            |
| `*`    | AND         | `A * B`            |
| `^`    | XOR         | `A ^ B`            |
| `'`    | postfix NOT | `A'` or `(A + B)'` |
| `( )`  | grouping    | `A * (B + C)`      |

NOT is evaluated first, AND and XOR share the next precedence level and are evaluated left-to-right, and OR is evaluated last. The website accepts at most 10 distinct variables, producing up to 1,024 rows.

Select any result value to inspect that row in the parse tree. Every node changes color to show its value, and the evaluation panel explains the calculation in post-order. **Copy link** stores the current expression in the URL so the same example can be shared directly.

## Local development

Requirements: Node.js 24 and npm 11.

```bash
npm install
npm start
```

Open `http://localhost:4200/` in a browser.

Other useful commands:

```bash
npm test
npm run build
npm run build:pages
```

## GitHub Pages deployment

GitHub Pages is enabled with **GitHub Actions** as its publishing source. The workflow in `.github/workflows/deploy-pages.yml` tests, builds, and deploys the application whenever `main` is pushed. It can also be started manually from the repository's **Actions** tab.

Generated `dist` files are deployed as an Actions artifact and are not committed.

The production build uses `/Truth-Table-Generator/` as its base path so scripts and styles resolve correctly on the project Pages URL.

## Original implementations

- `truth_table_generator.py` provides the Tkinter desktop version.
- `truth_table_generator.cpp` provides the original console implementation.

These files remain unchanged as legacy examples.
