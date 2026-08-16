/// <reference types="vite/client" />

// This one line is why `import "./theme/tokens.css"` typechecks. Vite lets a module import
// a .css file for its side effect, but TypeScript knows nothing about that until vite/client
// declares the ambient modules for CSS, images, and `import.meta.env`.
//
// Do not delete this file, and do not "fix" a CSS-import error by adding
// `types: ["vite/client"]` to tsconfig.app.json instead — the triple-slash reference here
// is the form the Vite scaffold uses (Maximus step-01 §4; without it every `.css` import is
// TS2307), and it keeps the tsconfig `types` array meaning "extra global type packages"
// rather than becoming load-bearing.
