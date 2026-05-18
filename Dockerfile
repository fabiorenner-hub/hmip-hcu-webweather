# ARM64 base image provided by eQ-3 for HCU plugins
FROM --platform=linux/arm64 ghcr.io/homematicip/alpine-node-simple:0.0.1

WORKDIR /app

COPY package*.json .
RUN npm install --omit=dev

COPY plugin.js .

# The HCU passes the mounted auth token at /TOKEN and its own hostname via host.containers.internal
ENTRYPOINT ["node", "plugin.js", "de.example.plugin.weather", "host.containers.internal", "/TOKEN"]

# Plugin metadata read by the HCU when installing the image
LABEL de.eq3.hmip.plugin.metadata=\
'{\
    "pluginId": "de.example.plugin.weather",\
    "issuer": "Example",\
    "version": "1.0.0",\
    "hcuMinVersion": "1.4.7",\
    "scope": "LOCAL",\
    "friendlyName": {\
        "en": "Open-Meteo Weather",\
        "de": "Open-Meteo Wetter"\
    },\
    "description": {\
        "en": "Exposes Open-Meteo weather data as a Homematic IP climate sensor.",\
        "de": "Stellt Open-Meteo-Wetterdaten als Homematic IP Klimasensor bereit."\
    },\
    "logsEnabled": true\
}'
