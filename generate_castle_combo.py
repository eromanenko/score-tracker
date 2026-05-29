import os
import json

out_dir = r"c:\Projects\GAMES\score-tracker\assets\games\castle-combo"
os.makedirs(out_dir, exist_ok=True)

# Generate grid SVGs
svg_template = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Grid -->
  <g stroke="#e6dbca" stroke-width="4" fill="#fdfaf1">
    <rect x="20" y="10" width="20" height="26" />
    <rect x="40" y="10" width="20" height="26" />
    <rect x="60" y="10" width="20" height="26" />
    <rect x="20" y="36" width="20" height="26" />
    <rect x="40" y="36" width="20" height="26" />
    <rect x="60" y="36" width="20" height="26" />
    <rect x="20" y="62" width="20" height="26" />
    <rect x="40" y="62" width="20" height="26" />
    <rect x="60" y="62" width="20" height="26" />
  </g>
  <!-- Pin -->
  <g transform="translate({px}, {py})">
    <path d="M 0 0 C -6 -8 -8 -12 -8 -16 C -8 -21 -4 -25 0 -25 C 4 -25 8 -21 8 -16 C 8 -12 6 -8 0 0 Z" fill="#5c3a21" />
    <circle cx="0" cy="-17" r="2.5" fill="#fff" />
  </g>
</svg>"""

positions = [
    (30, 27), (50, 27), (70, 27),
    (30, 53), (50, 53), (70, 53),
    (30, 79), (50, 79), (70, 79)
]

for i, (px, py) in enumerate(positions):
    content = svg_template.replace("{px}", str(px)).replace("{py}", str(py))
    with open(os.path.join(out_dir, f"pos-{i+1}.svg"), "w", encoding="utf-8") as f:
        f.write(content)

# Generate Key SVG
key_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 40 25 C 25 25 15 35 15 50 C 15 65 25 75 40 75 C 50 75 60 65 65 55 L 75 55 L 75 65 L 85 65 L 85 55 L 95 55 L 95 45 L 65 45 C 60 35 50 25 40 25 Z" fill="#c04020" stroke="#5c2010" stroke-width="4" stroke-linejoin="round" />
  <circle cx="35" cy="50" r="8" fill="#fff" stroke="#5c2010" stroke-width="4" />
</svg>"""
with open(os.path.join(out_dir, "key.svg"), "w", encoding="utf-8") as f:
    f.write(key_svg)

# Generate Header SVG (A castle)
header_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 20 80 L 20 40 L 30 40 L 30 50 L 40 50 L 40 40 L 60 40 L 60 50 L 70 50 L 70 40 L 80 40 L 80 80 Z" fill="#fff" stroke="#333" stroke-width="4" stroke-linejoin="round" />
  <rect x="40" y="60" width="20" height="20" fill="#fff" stroke="#333" stroke-width="4" stroke-linejoin="round" />
</svg>"""
with open(os.path.join(out_dir, "header.svg"), "w", encoding="utf-8") as f:
    f.write(header_svg)

# Generate Total SVG (Sigma)
total_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text x="50" y="75" fill="#fff" font-family="sans-serif" font-size="65" font-weight="bold" text-anchor="middle" stroke="#fff" stroke-width="2" stroke-linejoin="round">Σ</text>
</svg>"""
with open(os.path.join(out_dir, "total.svg"), "w", encoding="utf-8") as f:
    f.write(total_svg)

# Generate config.json
categories = []
for i in range(9):
    categories.append({
        "id": f"pos-{i+1}",
        "nameEN": "",
        "nameUK": "",
        "nameRU": "",
        "iconFile": f"pos-{i+1}.svg",
        "color": "rgba(210, 229, 241, 0.6)" if i % 2 == 0 else "transparent"
    })

categories.append({
    "id": "keys",
    "nameEN": "",
    "nameUK": "",
    "nameRU": "",
    "iconFile": "key.svg",
    "color": "transparent"
})

config = {
    "headerIconFile": "header.svg",
    "totalIconFile": "total.svg",
    "categories": categories
}

with open(os.path.join(out_dir, "config.json"), "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("Castle Combo assets generated.")
