// Копирует токены из replica/design в SCSS сайта. Источник правды — replica/design/tokens.json.
import fs from "node:fs";
const from = new URL("../../replica/design/", import.meta.url);
const to = new URL("../src/scss/", import.meta.url);
fs.copyFileSync(new URL("tokens.css", from), new URL("_tokens-vars.scss", to));
fs.copyFileSync(new URL("_tokens.scss", from), new URL("_bp.scss", to));
console.log("tokens synced");
