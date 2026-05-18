# Changelog

## 1.3.0 — 2026-05-08

- Neue Gerätestruktur: getrennte Sensoren für "jetzt", "heute" und "morgen".
  - "heute" und "morgen" tragen die Tageshöchsttemperatur.
  - Zusätzliche Tief-Geräte ("heute, Tief" / "morgen, Tief") zeigen die
    Tiefsttemperatur. Abschaltbar über die Plugin-Konfiguration.
- Konfig-GUI erweitert: einzelne Schalter für "Gerät für heute",
  "Gerät für morgen" und "Tiefsttemperatur anzeigen".
- Tief-Geräte melden nur `actualTemperature`, keine weiteren Features.

## 1.2.0 — 2026-05-08

- Konfigurations-GUI im HCU-Webinterface: Plugin beantwortet
  `CONFIG_TEMPLATE_REQUEST` mit einem zweisprachigen Formular (DE/EN) für
  Standort (Breiten-/Längengrad, Ortsname), Vorhersage-Schalter,
  Abfrageintervall und Sturm-Schwelle.
- Konfiguration wird in `/data/config.json` persistiert und überlebt
  Neustarts sowie Plugin-Updates.
- `CONFIG_UPDATE_REQUEST` wird validiert, gespeichert, direkt gegen
  Open-Meteo getestet und der Poller mit neuem Intervall neu gestartet.

## 1.1.0

- Zweites Gerät "Wetter <Ort> (morgen)" mit Tageshöchstwerten aus dem
  Open-Meteo-`daily`-Block (Temperatur-Max, Wind-Max, dominante Windrichtung,
  erwartete Niederschlagsmenge, Flags aus WMO-Wettercode).
- Gemeinsamer Weather-Fetch für beide Geräte, kein zusätzlicher API-Call.

## 1.0.0

- Erste Version: virtueller `CLIMATE_SENSOR` mit aktuellen Werten aus
  Open-Meteo (Temperatur, Luftfeuchte, Wind, Regen, Illumination, Sturm,
  Sonnenschein, Tagesregenmenge).
- WebSocket-Anbindung an die HCU gemäß Connect API.
- Docker-Image auf Basis von `ghcr.io/homematicip/alpine-node-simple`.
