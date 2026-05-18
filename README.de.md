> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

# HMIP HCU Plugin: Open-Meteo Wetter

Ein Plugin für die Homematic IP Home Control Unit (HCU), das Wetterdaten von
[Open-Meteo](https://open-meteo.com/) abruft und in der Homematic IP App als
`CLIMATE_SENSOR` erscheint.

## Geräte in der HMIP-App

Bis zu fünf virtuelle Geräte (alle vom Typ `CLIMATE_SENSOR`), getrennt nach
Zeitraum:

| Gerät                          | Zeigt                                              |
| ------------------------------ | -------------------------------------------------- |
| Wetter <Ort>                   | Aktuelle Messwerte                                 |
| Wetter <Ort> (heute)           | Tages-Höchsttemperatur + aggregierte Tageswerte    |
| Wetter <Ort> (heute, Tief)     | Tiefsttemperatur von heute                         |
| Wetter <Ort> (morgen)          | Tages-Höchsttemperatur morgen + Prognose-Tageswerte |
| Wetter <Ort> (morgen, Tief)    | Tiefsttemperatur morgen                            |

Die Geräte für "heute", "morgen" und die Tief-Varianten sind einzeln über die
Konfiguration abschaltbar.

> **Hinweis zur Temperatur:** Die Connect API unterstützt pro Gerät nur ein
> einzelnes Temperaturfeld. Um sowohl Maximum als auch Minimum anzuzeigen,
> werden die Tiefstwerte in separaten "Tief"-Geräten ausgegeben.

## Unterstützte Features je Gerät

| HMIP-Feature        | jetzt | heute / morgen | Tief |
| ------------------- | :---: | :------------: | :--: |
| `actualTemperature` | aktuell | Tagesmaximum | Tagesminimum |
| `humidity`          | aktuell | Tagesmittel | – |
| `windSpeed`         | aktuell | Maximum       | – |
| `windDirection`     | aktuell | dominant      | – |
| `illumination`      | aktuell | geschätzter Peak | – |
| `raining`           | ja    | ja            | – |
| `storm`             | ja    | ja            | – |
| `sunshine`          | ja    | ja            | – |
| `rainCount`         | heute/gestern | erwartete Menge | – |

## Auf der HCU installieren

1. `hmip-plugin-weather-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases)
   herunterladen.
2. In HCUweb *Entwicklermodus → Plugins → Upload* öffnen und die Datei wählen.
3. Konfigurieren unter *Plugins → Open-Meteo Wetter → Konfigurieren*.

## Konfiguration über die HCU-Oberfläche

**Gruppe Standort**
- **Breitengrad** (Dezimalgrad)
- **Längengrad** (Dezimalgrad)
- **Ortsname** — wird im Gerätenamen in der App angezeigt

**Gruppe Geräte**
- **Gerät für heute** — legt das Gerät mit Tageswerten für heute an
- **Gerät für morgen** — legt die Vorhersage für morgen an
- **Tiefsttemperatur anzeigen** — zusätzliche Tief-Geräte für heute und morgen

**Gruppe Verhalten**
- **Abfrageintervall (ms)** — zwischen 60 000 und 3 600 000 ms
- **Sturm-Schwelle (km/h)** — ab dieser Böenstärke wird das `storm`-Flag gesetzt

Gespeicherte Werte werden in `/data/config.json` abgelegt und überleben
Neustarts und Plugin-Updates.

## Aktualisierungsintervall

Open-Meteo aktualisiert die Daten modellabhängig typischerweise stündlich.
Default im Plugin: alle 10 Minuten. Beim Start, nach jeder Konfig-Änderung
und jeden Tick des Intervalls wird eine Abfrage ausgelöst und ein
`STATUS_EVENT` für alle aktiven Geräte gepusht.

## Voraussetzungen

- HCU mit aktiviertem Entwicklermodus (HCU-Firmware ≥ 1.4.7)
- Docker (nur falls du das Image selbst bauen möchtest)
- Internetzugang der HCU (für Open-Meteo)

## Lokal testen (ohne Container)

```bash
cd hmip-plugin-weather
npm install
# Auth-Token der HCU in authtoken.txt speichern, dann:
node plugin.js de.example.plugin.weather hcu1-XXXX.local authtoken.txt
```

Beim lokalen Test liegt die Konfiguration in `/data/config.json`. Auf
Nicht-Linux-Systemen ggf. mit `WEATHER_DATA_DIR` auf ein schreibbares
Verzeichnis umlenken:

```bash
WEATHER_DATA_DIR=./data node plugin.js ...
```

## Standort beim ersten Start

Beim allerersten Start (bevor jemand die GUI geöffnet hat) greifen die
ENV-Defaults:

| Variable                    | Bedeutung                       | Default        |
| --------------------------- | ------------------------------- | -------------- |
| `WEATHER_LAT`               | Breitengrad                     | `52.5200`      |
| `WEATHER_LON`               | Längengrad                      | `13.4050`      |
| `WEATHER_LOCATION_NAME`     | Anzeigename                     | `Open-Meteo`   |
| `WEATHER_POLL_MS`           | Pollintervall                   | `600000`       |
| `WEATHER_STORM_KMH`         | Sturm-Schwelle (Böen)           | `62`           |
| `WEATHER_TODAY_ENABLED`     | Gerät für heute                 | `true`         |
| `WEATHER_FORECAST_ENABLED`  | Gerät für morgen                | `true`         |
| `WEATHER_SHOW_MIN`          | Tiefsttemperatur-Geräte         | `true`         |

Sobald die Konfiguration einmal über HCUweb gespeichert wurde, gewinnt die
persistierte Konfig gegenüber den ENVs.

## Bauen und auf der HCU installieren

```bash
# 1. Image bauen (ARM64!)
docker buildx build --platform linux/arm64 --load -t de/example/plugin/weather:1.0.0 .

# 2. Als .tar.gz exportieren
docker save de/example/plugin/weather:1.0.0 | gzip > hmip-plugin-weather-1.0.0.tar.gz

# 3. HCU-Weboberfläche öffnen -> Plugins -> Upload -> Archiv auswählen
```

Alternativ die Skripte `build.sh` bzw. `build.ps1` verwenden.

## Hinweise

- Open-Meteo ist für nicht-kommerzielle Nutzung kostenlos und erfordert
  keinen API-Key.
- Die Lux-Schätzung aus Sonnenstrahlung ist näherungsweise. Messgenauigkeit
  hängt vom Open-Meteo-Modell ab.
- `CLIMATE_SENSOR` ist ein reines Sensor-Archetyp. `CONTROL_REQUEST` wird
  mit `success: false` beantwortet.

## Quellen

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Open-Meteo API Docs](https://open-meteo.com/en/docs)

## Lizenz

Apache-2.0
