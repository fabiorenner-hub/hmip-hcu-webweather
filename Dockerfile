# ARM64 base image provided by eQ-3 for HCU plugins
FROM --platform=linux/arm64 ghcr.io/homematicip/alpine-node-simple:0.0.1

WORKDIR /app

COPY package*.json .
RUN npm install --omit=dev

COPY plugin.js .

# The HCU passes the mounted auth token at /TOKEN and its own hostname via host.containers.internal
ENTRYPOINT ["node", "plugin.js", "de.example.plugin.weather", "host.containers.internal", "/TOKEN"]

LABEL de.eq3.hmip.plugin.metadata="{\"pluginId\":\"de.example.plugin.weather\",\"issuer\":\"Fabio Renner\",\"version\":\"1.1.0\",\"hcuMinVersion\":\"1.4.7\",\"scope\":\"LOCAL\",\"friendlyName\":{\"de\":\"Open-Meteo Wetter\",\"en\":\"Open-Meteo Weather\"},\"description\":{\"de\":\"Stellt Open-Meteo-Wetterdaten als Homematic IP Klimasensor bereit. GitHub: https://github.com/fabiorenner-hub/hmip-hcu-webweather - Spenden via PayPal: https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C\",\"en\":\"Exposes Open-Meteo weather data as a Homematic IP climate sensor. GitHub: https://github.com/fabiorenner-hub/hmip-hcu-webweather - Donate via PayPal: https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C\"},\"settings\":[],\"changelog\":\"1.1.0 - Plugin icon, GitHub link and PayPal donation hint added to plugin metadata, README and HCU description.\\n1.0.0 - Initial public release.\",\"logsEnabled\":true}"
