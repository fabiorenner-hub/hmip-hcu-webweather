> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-weather Symbolbild" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Open-Meteo Wetter

📦 **[hmip-plugin-weather-1.1.2.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases/latest/download/hmip-plugin-weather-1.1.2.tar.gz)** — Installation in HCUweb über *Entwicklermodus → Plugins → Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-webweather>

Ein Homematic IP HCU-Plugin, das Wetterdaten von
[Open-Meteo](https://open-meteo.com/) abruft und als `CLIMATE_SENSOR`-Geräte
in der Homematic IP App bereitstellt.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie
hält bei mir die Lichter an, während ich weitere HCU-Plugins baue:
[Spenden via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## Geräte in der HMIP-App

Bis zu fünf virtuelle `CLIMATE_SENSOR`-Geräte, getrennt nach Zeitraum
(jetzt, heute, morgen, jeweils Hoch- und Tieftemperatur). Die einzelnen
Geräte lassen sich in der Konfiguration aktivieren bzw. deaktivieren.

## Auf der HCU installieren

1. `hmip-plugin-weather-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases) holen.
2. In HCUweb *Entwicklermodus → Plugins → Hochladen* öffnen und die Datei auswählen.
3. Konfiguration unter *Plugins → Open-Meteo Wetter → Konfigurieren*.

## Selbst bauen

```powershell
./build.ps1   # Windows
```

```bash
chmod +x build.sh
./build.sh    # macOS / Linux
```

## Hinweise

- Open-Meteo ist kostenlos für nicht-kommerzielle Nutzung und braucht keinen API-Key.
- `CLIMATE_SENSOR` ist ein reiner Sensor-Archetyp. `CONTROL_REQUEST` wird mit
  `success: false` beantwortet.

## Referenzen

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Open-Meteo API docs](https://open-meteo.com/en/docs)

## Herausgeber

Herausgegeben von **Fabio Renner**.

## Lizenz

Apache-2.0
