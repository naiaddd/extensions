import json
import os

config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')

with open(config_path, 'r') as f:
    config = json.load(f)

# Remove old Github.com and Centrelink (we will append the user's version of Centrelink to preserve order)
config['links'] = [l for l in config['links'] if l['name'] not in ('Github.com', 'Centrelink.gov.au')]

new_links = [
  {
    "name": "Centrelink.gov.au",
    "url": "https://centrelink.gov.au",
    "icon": "icons/centrelink.gov.au.ico"
  },
  {
    "name": "Git",
    "url": "https://github.com",
    "icon": "icons/github.com.png"
  },
  {
    "name": "git/naiad",
    "url": "https://github.com/naiaddd",
    "icon": "icons/github.com.png"
  },
  {
    "name": "Music",
    "url": "https://music.youtube.com/",
    "icon": ""
  },
  {
    "name": "telegram",
    "url": "https://web.telegram.org/a/",
    "icon": ""
  },
  {
    "name": "2142",
    "url": "https://battlefield2142.co/",
    "icon": ""
  }
]

config['links'].extend(new_links)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=4)
