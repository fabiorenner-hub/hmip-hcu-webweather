# Bauen des HCU-Plugins

Dieses Paket enthält die Quellen für das Homematic-IP-HCU-Plugin
"Open-Meteo Wetter". Der Build muss auf einem Rechner mit funktionierendem
Docker-Daemon ausgeführt werden und erzeugt die Datei
`hmip-plugin-weather-1.0.0.tar.gz`, die du im HCU-Webinterface
(Entwicklermodus aktiviert) unter "Plugins" hochlädst.

## Voraussetzungen

- Docker Desktop (Windows/macOS) oder Docker Engine (Linux)
- `docker buildx` (bei Docker Desktop automatisch dabei)
- Auf Linux zusätzlich: QEMU für ARM64-Cross-Builds
  ```bash
  docker run --privileged --rm tonistiigi/binfmt --install arm64
  ```

## Optional vor dem Build

Plugin-ID in `Dockerfile` auf deine eigene Reverse-Domain ändern
(zweimal: im `ENTRYPOINT` und im `pluginId`-Label), z.B.
`de.meinname.plugin.weather`. Standortkoordinaten kannst du im Dockerfile
als `ENV` setzen, z.B.:

```
ENV WEATHER_LAT=48.1351
ENV WEATHER_LON=11.5820
ENV WEATHER_LOCATION_NAME="München"
```

## Build auf Linux / macOS

```bash
chmod +x build.sh
./build.sh
```

## Build auf Windows (PowerShell)

```powershell
.\build.ps1
```

## Build manuell (Einzeilen, plattformunabhängig)

```bash
docker buildx build --platform linux/arm64 --load -t de/example/plugin/weather:1.0.0 .
docker save de/example/plugin/weather:1.0.0 | gzip > hmip-plugin-weather-1.0.0.tar.gz
```

## Installation auf der HCU

1. HCU-Webinterface öffnen.
2. Entwicklermodus aktivieren (falls noch nicht geschehen).
3. Unter "Plugins" das erzeugte `hmip-plugin-weather-1.0.0.tar.gz` hochladen.
4. Plugin starten. In der Homematic-IP-App erscheint ein neues Gerät
   "Wetter Open-Meteo" (bzw. dein `WEATHER_LOCATION_NAME`).

Details zu Features und Konfiguration: siehe `README.md`.
