import json
import os

config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')

with open(config_path, 'r') as f:
    config = json.load(f)

icon_map = {
    "X.com": "icons/x.com.ico",
    "Mail.google.com": "icons/mail.google.com.ico",
    "Boards.4chan.org": "icons/boards.4chan.org.png",
    "Youtube.com": "icons/youtube.com.png",
    "Google.com": "icons/google.com.ico",
    "Gemini.google.com": "icons/gemini.google.com.png",
    "Amazon.com.au": "icons/amazon.com.au.ico",
    "Centrelink.gov.au": "icons/centrelink.gov.au.ico"
}

for link in config['links']:
    if link['name'] in icon_map:
        link['icon'] = icon_map[link['name']]

with open(config_path, 'w') as f:
    json.dump(config, f, indent=4)
