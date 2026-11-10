#!/usr/bin/env python3
"""tokens.json -> tokens.css (CSS-переменные) + _tokens.scss (переменные и брейкпоинты для SCSS).

    python replica/design/build_tokens.py

Запускать после каждой правки tokens.json, затем contrast.py.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
t = json.loads((HERE / "tokens.json").read_text(encoding="utf-8"))

css = ["/* Сгенерировано build_tokens.py из tokens.json — руками не править */", ":root {"]
for k, v in t["color"].items():
    css.append(f"  --c-{k}: {v};")
css.append(f"  --font-sans: {t['font']['sans']};")
css.append(f"  --font-mono: {t['font']['mono']};")
for k, v in t["type"].items():
    size = v.get("fluid") or f"{v['size']}px"
    css.append(f"  --fs-{k}: {size};")
    css.append(f"  --lh-{k}: {v['line'] / v['size']:.3f};")
    css.append(f"  --fw-{k}: {v['weight']};")
for i, v in enumerate(t["space"]):
    css.append(f"  --sp-{i}: {v}px;")
css.append(f"  --section: {t['section']['mobile']}px;")
for k, v in t["radius"].items():
    css.append(f"  --r-{k}: {v}px;")
for k, v in t["shadow"].items():
    css.append(f"  --sh-{k}: {v};")
lay = t["layout"]
css += [f"  --container: {lay['container']}px;", f"  --gutter: {lay['gutter']}px;",
        f"  --header-h: {lay['header-mobile']}px;", f"  --tabbar-h: {lay['tabbar-mobile']}px;",
        f"  --drawer-w: {lay['drawer']}px;"]
for k, v in t["control"].items():
    css.append(f"  --ctl-{k}: {v}px;")
for k, v in t["motion"].items():
    css.append(f"  --m-{k}: {v};")
for k, v in t["z"].items():
    css.append(f"  --z-{k}: {v};")
css.append("}")
css.append(f"@media (min-width: {lay['breakpoints']['lg']}px) {{")
css.append(f"  :root {{ --section: {t['section']['desktop']}px; --header-h: {lay['header']}px; --tabbar-h: 0px; }}")
css.append("}")
css.append("@media (prefers-reduced-motion: reduce) {")
css.append("  :root { --m-fast: 0ms; --m-base: 0ms; --m-slow: 0ms; }")
css.append("}")
(HERE / "tokens.css").write_text("\n".join(css) + "\n", encoding="utf-8")

scss = ["// Сгенерировано build_tokens.py из tokens.json — руками не править",
        "// Значения берите через var(--...); здесь только то, что нельзя в CSS-переменных: брейкпоинты."]
for k, v in lay["breakpoints"].items():
    scss.append(f"$bp-{k}: {v}px;")
scss += ["", "@mixin up($bp) {", "  @media (min-width: $bp) { @content; }", "}",
         "@mixin down($bp) {", "  @media (max-width: $bp - 0.02px) { @content; }", "}"]
(HERE / "_tokens.scss").write_text("\n".join(scss) + "\n", encoding="utf-8")
print("tokens.css и _tokens.scss обновлены")
