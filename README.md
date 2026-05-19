> 🇬🇧 English | [🇩🇪 Deutsch](README.de.md)

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-weather icon" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Open-Meteo Weather

📦 **[Download hmip-plugin-weather-1.1.2.tar.gz](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases/latest/download/hmip-plugin-weather-1.1.2.tar.gz)** — install via HCUweb → *Developer mode → Plugins → Install from file*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-webweather>

A Homematic IP HCU plugin that pulls weather data from
[Open-Meteo](https://open-meteo.com/) and exposes it as `CLIMATE_SENSOR`
devices in the Homematic IP app.

## Support

If this plugin is useful to you, please consider a small donation — it helps
me keep the lights on while building more HCU plugins:
[Donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## Devices in the HMIP app

Up to five virtual `CLIMATE_SENSOR` devices, separated by time period:

| Device                              | Shows                                            |
| ----------------------------------- | ------------------------------------------------ |
| Weather <Location>                  | Current readings                                 |
| Weather <Location> (today)          | Daily high temperature + aggregated daily values |
| Weather <Location> (today, low)     | Today's low temperature                          |
| Weather <Location> (tomorrow)       | Tomorrow's high + forecast daily values          |
| Weather <Location> (tomorrow, low)  | Tomorrow's low temperature                       |

The "today", "tomorrow" and "low" devices can be enabled or disabled
individually in the configuration.

## Install on your HCU

1. Download `hmip-plugin-weather-<version>.tar.gz` from the
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases).
2. In HCUweb open *Developer mode → Plugins → Upload* and select the file.
3. Configure under *Plugins → Open-Meteo Weather → Configure*.

## Build it yourself

```powershell
./build.ps1   # Windows
```

```bash
chmod +x build.sh
./build.sh    # macOS / Linux
```

## Notes

- Open-Meteo is free for non-commercial use and does not need an API key.
- `CLIMATE_SENSOR` is a sensor-only archetype. `CONTROL_REQUEST` is answered
  with `success: false`.

## References

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Open-Meteo API docs](https://open-meteo.com/en/docs)

## Author

Issued by **Fabio Renner**.

### Third-party components

- Weather data from [Open-Meteo](https://open-meteo.com/) (free for non-commercial use; attribution requested).
- Built against the [Homematic IP Connect API 1.0.1](https://github.com/homematicip/connect-api) by eQ-3.

## License

Apache-2.0
