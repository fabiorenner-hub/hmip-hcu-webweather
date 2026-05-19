> [ðŸ‡¬ðŸ‡§ English](README.md) | ðŸ‡©ðŸ‡ª Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-weather Symbolbild" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Open-Meteo Wetter

ðŸ“¦ **[hmip-plugin-weather-1.1.1.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases/latest/download/hmip-plugin-weather-1.1.1.tar.gz)** â€” Installation in HCUweb Ã¼ber *Entwicklermodus â†’ Plugins â†’ Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-webweather>

Ein Homematic IP HCU-Plugin, das Wetterdaten von
[Open-Meteo](https://open-meteo.com/) abruft und als `CLIMATE_SENSOR`-GerÃ¤te
in der Homematic IP App bereitstellt.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie
hält bei mir die Lichter an, während ich weitere HCU-Plugins baue:
[Spenden via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## GerÃ¤te in der HMIP-App

Bis zu fÃ¼nf virtuelle `CLIMATE_SENSOR`-GerÃ¤te, getrennt nach Zeitraum
(jetzt, heute, morgen, jeweils Hoch- und Tieftemperatur).

## Auf der HCU installieren

1. `hmip-plugin-weather-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases) holen.
2. In HCUweb *Entwicklermodus â†’ Plugins â†’ Hochladen* Ã¶ffnen und die Datei auswÃ¤hlen.
3. Konfiguration unter *Plugins â†’ Open-Meteo Wetter â†’ Konfigurieren*.

## Selbst bauen

```bash
./build.sh    # Linux/macOS
# oder
./build.ps1   # Windows
```

## Herausgeber

Herausgegeben von **Fabio Renner**.

## Lizenz

Apache-2.0
