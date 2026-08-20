# Truth Table Generator

An interactive Angular website for generating complete truth tables from Boolean expressions. The project also retains the original Python and C++ implementations that inspired the web version.

Once GitHub Pages is enabled, the website will be available at:

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

The workflow in `.github/workflows/deploy-pages.yml` tests, builds, and deploys the application whenever `main` is pushed. Generated `dist` files are deployed as an Actions artifact and are not committed.

After pushing the changes for the first time:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Run the workflow manually from **Actions**, or push another commit to `main`.

The production build uses `/Truth-Table-Generator/` as its base path so scripts and styles resolve correctly on the project Pages URL.

## Original implementations

- `truth_table_generator.py` provides the Tkinter desktop version.
- `truth_table_generator.cpp` provides the original console implementation.

These files remain unchanged as legacy examples.
