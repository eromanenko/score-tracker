import zipfile
import json
import os

os.makedirs('assets/games', exist_ok=True)

# 7 Wonders
config_7w = {
  "categories": [
    { "id": "military", "nameEN": "Military", "nameUK": "Військо", "nameRU": "Военные", "iconFile": "military.png" },
    { "id": "coins", "nameEN": "Coins (1 per 3)", "nameUK": "Монети (1 за 3)", "nameRU": "Монеты", "iconFile": "coins.png", "divider": 3 },
    { "id": "wonders", "nameEN": "Wonders", "nameUK": "Дива", "nameRU": "Чудеса", "iconFile": "wonders.png" },
    { "id": "civic", "nameEN": "Civic (Blue)", "nameUK": "Громадські (сині)", "nameRU": "Гражданские", "iconFile": "civic.png" },
    { "id": "science", "nameEN": "Science (Green)", "nameUK": "Наука (зелені)", "nameRU": "Наука", "iconFile": "science.png" },
    { "id": "commercial", "nameEN": "Commercial (Yellow)", "nameUK": "Комерційні (жовті)", "nameRU": "Коммерческие", "iconFile": "commercial.png" },
    { "id": "guilds", "nameEN": "Guilds (Purple)", "nameUK": "Гільдії (фіолетові)", "nameRU": "Гильдии", "iconFile": "guilds.png" }
  ]
}

# Create dummy transparent 1x1 png for testing so it doesn't crash
dummy_png = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082')

with zipfile.ZipFile('assets/games/7-wonders.zip', 'w') as z:
    z.writestr('config.json', json.dumps(config_7w, ensure_ascii=False, indent=2))
    for cat in config_7w['categories']:
        z.writestr(cat['iconFile'], dummy_png)

# Take 6
config_take6 = {
  "winCondition": "lowest",
  "targetScore": 66
}

with zipfile.ZipFile('assets/games/take-6.zip', 'w') as z:
    z.writestr('config.json', json.dumps(config_take6, ensure_ascii=False, indent=2))

# Star Realms
config_sr = {
  "startScore": 50,
  "winCondition": "highest",
  "buttons": [-5, -1, 1, 5]
}

with zipfile.ZipFile('assets/games/star-realms.zip', 'w') as z:
    z.writestr('config.json', json.dumps(config_sr, ensure_ascii=False, indent=2))

print("Zip files created successfully.")
