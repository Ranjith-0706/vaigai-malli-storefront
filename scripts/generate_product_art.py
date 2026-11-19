"""Generate ORIGINAL illustrative SVG artwork for the demo products.

These are stylised illustrations (not photographs) created for this project, so they carry
no third-party licence. Run:  python scripts/generate_product_art.py
Output: frontend/public/products/<slug>/{drape,border,weave}.svg
"""

import math
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "products"
GOLD = "#c9a24a"
GOLD_LIGHT = "#e6cb84"

# slug: (body, border colour, motif, accent)
SPEC = {
    "meenakshi-maroon-kanchipuram": ("#7a1424", "#1f5e46", "gopuram", GOLD),
    "thodarkodi-jasmine-ivory": ("#efe6d2", "#1f5e46", "jasmine", GOLD),
    "kumkum-bridal-kanchipuram": ("#a3141e", "#1f5e46", "kasu", GOLD_LIGHT),
    "mayil-kanchi-peacock-blue": ("#0e5a6b", "#7a1424", "mayil", GOLD),
    "gopuram-border-peacock-green": ("#1f5e46", "#7a1424", "gopuram", GOLD),
    "rudraksham-border-mustard": ("#c9922b", "#7a1424", "rudraksha", "#f4e3b0"),
    "arakku-lakshmi-pottu": ("#9b1b30", "#d8b45a", "kasu", GOLD_LIGHT),
    "malli-soft-silk-ivory": ("#f1ead8", "#7a1424", "jasmine", GOLD),
    "karuppu-kodi-soft-silk": ("#1d1a1a", GOLD, "vine", GOLD_LIGHT),
    "mango-kolam-rani-pink": ("#b5245e", "#1f5e46", "mango", GOLD_LIGHT),
    "vaigai-indigo-handloom": ("#2b3a67", "#efe6d2", "check", "#efe6d2"),
    "pavalam-coral-cotton": ("#c8553d", "#2b3a67", "check", "#f6dccb"),
    "thulasi-green-silk-cotton": ("#4a7c3b", GOLD, "vine", GOLD_LIGHT),
    "sandal-silk-cotton-contemporary": ("#c8ad82", "#5b3a29", "check", "#fff3d6"),
    "navy-zari-check-cotton": ("#1b2748", GOLD, "check", GOLD_LIGHT),
}


def shade(hex_color: str, factor: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    if factor >= 0:
        r, g, b = (round(c + (255 - c) * factor) for c in (r, g, b))
    else:
        r, g, b = (round(c * (1 + factor)) for c in (r, g, b))
    return f"#{r:02x}{g:02x}{b:02x}"


def motif(kind: str, cx: float, cy: float, s: float, color: str, opacity: float = 1) -> str:
    o = f'opacity="{opacity}"'
    if kind == "gopuram":
        steps = []
        for i in range(5):
            w = s * (1 - i * 0.17)
            steps.append(f'<rect x="{cx - w / 2:.1f}" y="{cy + s * 0.5 - (i + 1) * s * 0.18:.1f}" width="{w:.1f}" height="{s * 0.15:.1f}" fill="{color}"/>')
        steps.append(f'<circle cx="{cx}" cy="{cy - s * 0.5:.1f}" r="{s * 0.06:.1f}" fill="{color}"/>')
        return f'<g {o}>' + "".join(steps) + "</g>"
    if kind == "jasmine":
        petals = "".join(
            f'<ellipse cx="{cx}" cy="{cy - s * 0.28:.1f}" rx="{s * 0.13:.1f}" ry="{s * 0.28:.1f}" transform="rotate({a} {cx} {cy})" fill="{color}"/>'
            for a in range(0, 360, 72)
        )
        return f'<g {o}>{petals}<circle cx="{cx}" cy="{cy}" r="{s * 0.09:.1f}" fill="#1f5e46"/></g>'
    if kind == "kasu":
        return (
            f'<g {o}><circle cx="{cx}" cy="{cy}" r="{s * 0.45:.1f}" fill="none" stroke="{color}" stroke-width="{s * 0.07:.1f}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{s * 0.27:.1f}" fill="{color}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{s * 0.1:.1f}" fill="#00000040"/></g>'
        )
    if kind == "mayil":
        feather = (
            f'<path d="M{cx} {cy + s * 0.5:.1f} C{cx - s * 0.5:.1f} {cy + s * 0.1:.1f} {cx - s * 0.3:.1f} {cy - s * 0.5:.1f} {cx} {cy - s * 0.55:.1f} '
            f'C{cx + s * 0.3:.1f} {cy - s * 0.5:.1f} {cx + s * 0.5:.1f} {cy + s * 0.1:.1f} {cx} {cy + s * 0.5:.1f}Z" fill="{color}"/>'
        )
        eye = f'<ellipse cx="{cx}" cy="{cy - s * 0.1:.1f}" rx="{s * 0.14:.1f}" ry="{s * 0.2:.1f}" fill="#0e5a6b"/><ellipse cx="{cx}" cy="{cy - s * 0.1:.1f}" rx="{s * 0.06:.1f}" ry="{s * 0.1:.1f}" fill="#7a1424"/>'
        return f"<g {o}>{feather}{eye}</g>"
    if kind == "rudraksha":
        dots = "".join(
            f'<circle cx="{cx + math.cos(a) * s * 0.26:.1f}" cy="{cy + math.sin(a) * s * 0.26:.1f}" r="{s * 0.06:.1f}" fill="{color}"/>'
            for a in [i * math.pi / 4 for i in range(8)]
        )
        return f'<g {o}><circle cx="{cx}" cy="{cy}" r="{s * 0.4:.1f}" fill="{color}"/><circle cx="{cx}" cy="{cy}" r="{s * 0.32:.1f}" fill="#7a142455"/>{dots}</g>'
    if kind == "mango":
        return (
            f'<path {o} d="M{cx - s * 0.3:.1f} {cy + s * 0.5:.1f} C{cx - s * 0.6:.1f} {cy - s * 0.1:.1f} {cx} {cy - s * 0.6:.1f} {cx + s * 0.35:.1f} {cy - s * 0.2:.1f} '
            f'C{cx + s * 0.1:.1f} {cy - s * 0.1:.1f} {cx + s * 0.2:.1f} {cy + s * 0.3:.1f} {cx - s * 0.3:.1f} {cy + s * 0.5:.1f}Z" fill="{color}"/>'
        )
    if kind == "vine":
        return (
            f'<g {o}><path d="M{cx - s * 0.5:.1f} {cy} Q{cx - s * 0.25:.1f} {cy - s * 0.35:.1f} {cx} {cy} T{cx + s * 0.5:.1f} {cy}" fill="none" stroke="{color}" stroke-width="{s * 0.06:.1f}"/>'
            f'<ellipse cx="{cx - s * 0.25:.1f}" cy="{cy - s * 0.3:.1f}" rx="{s * 0.1:.1f}" ry="{s * 0.05:.1f}" fill="{color}" transform="rotate(-30 {cx - s * 0.25:.1f} {cy - s * 0.3:.1f})"/>'
            f'<ellipse cx="{cx + s * 0.25:.1f}" cy="{cy + s * 0.3:.1f}" rx="{s * 0.1:.1f}" ry="{s * 0.05:.1f}" fill="{color}" transform="rotate(-30 {cx + s * 0.25:.1f} {cy + s * 0.3:.1f})"/></g>'
        )
    # check
    return (
        f'<g {o} stroke="{color}" stroke-width="{s * 0.05:.1f}" fill="none"><path d="M{cx - s * 0.45:.1f} {cy} H{cx + s * 0.45:.1f} M{cx} {cy - s * 0.45:.1f} V{cy + s * 0.45:.1f}"/></g>'
    )


def band(kind: str, y: float, h: float, x0: float, x1: float, color: str, step: float) -> str:
    n = int((x1 - x0) / step)
    return "".join(motif(kind, x0 + step * (i + 0.5), y + h / 2, h * 0.8, color) for i in range(n))


def defs(body: str) -> str:
    return (
        f'<defs><linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".18"/>'
        f'<stop offset=".35" stop-color="#fff" stop-opacity=".10"/><stop offset=".7" stop-color="#000" stop-opacity=".08"/>'
        f'<stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>'
        f'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6efe2"/><stop offset="1" stop-color="#e9dcc3"/></linearGradient>'
        f'<pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H6M0 3H6" stroke="#fff" stroke-opacity=".07" stroke-width="1"/>'
        f'<path d="M0 0V6M3 0V6" stroke="#000" stroke-opacity=".07" stroke-width="1"/></pattern></defs>'
    )


def svg(inner: str, title: str, w: int = 800, h: int = 1000) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{inner}</svg>"
    )


def drape(slug: str, body: str, edge: str, kind: str, accent: str) -> str:
    x0, x1 = 120, 680
    parts = [defs(body), '<rect width="800" height="1000" fill="url(#bg)"/>']
    # soft floor shadow
    parts.append('<ellipse cx="400" cy="962" rx="280" ry="16" fill="#00000018"/>')
    # cloth
    parts.append(f'<path d="M{x0} 70 Q400 40 {x1} 70 L{x1 + 14} 950 Q400 975 {x0 - 14} 950Z" fill="{body}"/>')
    parts.append(f'<path d="M{x0} 70 Q400 40 {x1} 70 L{x1 + 14} 950 Q400 975 {x0 - 14} 950Z" fill="url(#weave)"/>')
    # side borders
    parts.append(f'<rect x="{x0}" y="62" width="46" height="890" fill="{edge}"/><rect x="{x1 - 46}" y="62" width="46" height="890" fill="{edge}"/>')
    for xb in (x0 + 4, x1 - 8):
        parts.append(f'<rect x="{xb}" y="62" width="4" height="890" fill="{accent}"/>')
    # body motifs scattered
    for r in range(7):
        for c in range(4):
            cx = 230 + c * 112 + (56 if r % 2 else 0)
            if cx < 640:
                parts.append(motif(kind if kind != "check" else "kasu", cx, 150 + r * 82, 26, accent, 0.55))
    # pallu band
    parts.append(f'<rect x="{x0 + 46}" y="690" width="{x1 - x0 - 92}" height="262" fill="{edge}" opacity=".92"/>')
    parts.append(f'<rect x="{x0 + 46}" y="690" width="{x1 - x0 - 92}" height="6" fill="{accent}"/>')
    parts.append(f'<rect x="{x0 + 46}" y="946" width="{x1 - x0 - 92}" height="6" fill="{accent}"/>')
    parts.append(band(kind, 706, 56, x0 + 56, x1 - 56, accent, 62))
    parts.append(band("kasu" if kind != "kasu" else "jasmine", 786, 40, x0 + 56, x1 - 56, accent, 56))
    parts.append(band(kind, 846, 70, x0 + 56, x1 - 56, accent, 78))
    # pleats + sheen
    for i, x in enumerate(range(250, 560, 31)):
        parts.append(f'<path d="M{x} 520 L{x - 6 + i} 952" stroke="#000" stroke-opacity=".16" stroke-width="2"/><path d="M{x + 4} 520 L{x - 2 + i} 952" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>')
    parts.append(f'<path d="M{x0} 70 Q400 40 {x1} 70 L{x1 + 14} 950 Q400 975 {x0 - 14} 950Z" fill="url(#sheen)"/>')
    return svg("".join(parts), f"{slug.replace('-', ' ').title()} — drape (illustration)")


def border_view(slug: str, body: str, edge: str, kind: str, accent: str) -> str:
    parts = [defs(body), f'<rect width="800" height="1000" fill="{body}"/><rect width="800" height="1000" fill="url(#weave)"/>']
    parts.append(f'<rect y="170" width="800" height="560" fill="{edge}"/><rect y="170" width="800" height="10" fill="{accent}"/><rect y="720" width="800" height="10" fill="{accent}"/>')
    parts.append(f'<rect y="200" width="800" height="3" fill="{accent}" opacity=".7"/><rect y="697" width="800" height="3" fill="{accent}" opacity=".7"/>')
    parts.append(band(kind, 215, 150, 20, 780, accent, 160))
    parts.append(band("kasu" if kind != "kasu" else "jasmine", 385, 90, 20, 780, accent, 100))
    parts.append(band(kind, 490, 190, 20, 780, accent, 200))
    for x in range(0, 800, 40):
        parts.append(f'<path d="M{x} 730 l20 26 l20 -26z" fill="{accent}" opacity=".85"/>')
    parts.append('<rect width="800" height="1000" fill="url(#sheen)" opacity=".5"/>')
    return svg("".join(parts), f"{slug.replace('-', ' ').title()} — border detail (illustration)")


def weave_view(slug: str, body: str, edge: str, kind: str, accent: str) -> str:
    parts = [defs(body), f'<rect width="800" height="1000" fill="{body}"/>']
    # horizontal weft threads
    for y in range(0, 1000, 8):
        parts.append(f'<rect y="{y}" width="800" height="4" fill="{shade(body, 0.06)}"/>')
    for x in range(0, 800, 8):
        parts.append(f'<rect x="{x}" width="3" height="1000" fill="{shade(body, -0.12)}" opacity=".45"/>')
    for r in range(5):
        for c in range(4):
            cx = 120 + c * 190 + (95 if r % 2 else 0)
            if cx < 760:
                parts.append(motif(kind if kind != "check" else "kasu", cx, 140 + r * 190, 96, accent, 0.9))
    parts.append('<rect width="800" height="1000" fill="url(#sheen)" opacity=".7"/>')
    return svg("".join(parts), f"{slug.replace('-', ' ').title()} — weave texture (illustration)")


def main() -> None:
    for slug, (body, edge, kind, accent) in SPEC.items():
        d = OUT / slug
        d.mkdir(parents=True, exist_ok=True)
        (d / "drape.svg").write_text(drape(slug, body, edge, kind, accent), encoding="utf-8")
        (d / "border.svg").write_text(border_view(slug, body, edge, kind, accent), encoding="utf-8")
        (d / "weave.svg").write_text(weave_view(slug, body, edge, kind, accent), encoding="utf-8")
    print(f"Wrote {len(SPEC) * 3} SVG files to {OUT}")


if __name__ == "__main__":
    main()
