> 🇬🇧 English | [🇩🇪 Deutsch](README.de.md)

# HMIP HCU Plugin: Open-Meteo Weather

A Homematic IP HCU plugin that pulls weather data from
[Open-Meteo](https://open-meteo.com/) and exposes it as `CLIMATE_SENSOR`
devices in the Homematic IP app.

## Devices in the HMIP app

Up to five virtual `CLIMATE_SENSOR` devices, separated by time period:

| Device                          | Shows                                              |
| ------------------------------- | -------------------------------------------------- |
| Weather <Location>              | Current readings                                   |
| Weather <Location> (today)      | Daily high temperature + aggregated daily values   |
| Weather <Location> (today, low) | Today's low temperature                            |
| Weather <Location> (tomorrow)   | Tomorrow's high + forecast daily values            |
| Weather <Location> (tomorrow, low) | Tomorrow's low temperature                      |

The "today", "tomorrow" and "low" devices can be enabled or disabled
individually in the configuration.

> **A note on temperature:** the Connect API supports only one temperature
> field per device. To show both highs and lows, the lows are exposed as
> separate "low" devices.

## Supported features per device

| HMIP feature        | now   | today / tomorrow | low |
| ------------------- | :---: | :--------------: | :-: |
| `actualTemperature` | current | daily max      | daily min |
| `humidity`          | current | daily mean     | – |
| `windSpeed`         | current | max            | – |
| `windDirection`     | current | dominant       | – |
| `illumination`      | current | estimated peak | – |
| `raining`           | yes   | yes              | – |
| `storm`             | yes   | yes              | – |
| `sunshine`          | yes   | yes              | – |
| `rainCount`         | today/yesterday | expected accumulation | – |

## Install on your HCU

1. Download `hmip-plugin-weather-<version>.tar.gz` from the
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases).
2. In HCUweb open *Developer mode → Plugins → Upload* and select the file.
3. Configure under *Plugins → Open-Meteo Weather → Configure*.

## Configuration via the HCU UI

**Location group**
- **Latitude** (decimal degrees)
- **Longitude** (decimal degrees)
- **Location name** — used as part of the device name in the app

**Devices group**
- **Today device** — create the device with today's daily values
- **Tomorrow device** — create the forecast device for tomorrow
- **Show low temperature** — additional "low" devices for today and tomorrow

**Behavior group**
- **Polling interval (ms)** — between 60 000 and 3 600 000 ms
- **Storm threshold (km/h)** — `storm` flag is set above this gust speed

Saved values are stored in `/data/config.json` and persist across restarts
and plugin updates.

## Update interval

Open-Meteo updates the data hourly depending on the model. Default is every
10 minutes. On startup, after each config change, and on every interval tick
the plugin queries Open-Meteo and pushes a `STATUS_EVENT` for all enabled
devices.

## Prerequisites

- HCU with developer mode enabled (firmware ≥ 1.4.7)
- Docker (only if you want to build the image yourself)
- HCU has internet access (for Open-Meteo)

## Test locally without a container

```bash
cd hmip-plugin-weather
npm install
# Save the HCU auth token to authtoken.txt, then:
node plugin.js de.example.plugin.weather hcu1-XXXX.local authtoken.txt
```

When testing locally the config lives in `/data/config.json`. On non-Linux
hosts, redirect with `WEATHER_DATA_DIR`:

```bash
WEATHER_DATA_DIR=./data node plugin.js ...
```

## First-start location defaults

The very first start (before anyone has opened the GUI) uses these env
defaults:

| Variable                    | Meaning                          | Default        |
| --------------------------- | -------------------------------- | -------------- |
| `WEATHER_LAT`               | latitude                         | `52.5200`      |
| `WEATHER_LON`               | longitude                        | `13.4050`      |
| `WEATHER_LOCATION_NAME`     | display name                     | `Open-Meteo`   |
| `WEATHER_POLL_MS`           | polling interval                 | `600000`       |
| `WEATHER_STORM_KMH`         | storm threshold (gusts)          | `62`           |
| `WEATHER_TODAY_ENABLED`     | "today" device                   | `true`         |
| `WEATHER_FORECAST_ENABLED`  | "tomorrow" device                | `true`         |
| `WEATHER_SHOW_MIN`          | "low" devices                    | `true`         |

Once the GUI saved a configuration, the persisted config wins over the env
defaults.

## Build and install on the HCU

```bash
# 1. Build the image (ARM64!)
docker buildx build --platform linux/arm64 --load -t de/example/plugin/weather:1.0.0 .

# 2. Export as .tar.gz
docker save de/example/plugin/weather:1.0.0 | gzip > hmip-plugin-weather-1.0.0.tar.gz

# 3. Open HCUweb -> Plugins -> Upload -> select the archive
```

Or use the supplied `build.sh` / `build.ps1`.

## Notes

- Open-Meteo is free for non-commercial use and does not need an API key.
- The lux estimate from solar radiation is approximate, and accuracy depends
  on the Open-Meteo model.
- `CLIMATE_SENSOR` is a sensor-only archetype. `CONTROL_REQUEST` is answered
  with `success: false`.

## References

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Open-Meteo API docs](https://open-meteo.com/en/docs)

## License

Apache-2.0
