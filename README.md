> ðŸ‡¬ðŸ‡§ English | [ðŸ‡©ðŸ‡ª Deutsch](README.de.md)

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-weather icon" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Open-Meteo Weather

ðŸ“¦ **[Download hmip-plugin-weather-1.1.1.tar.gz](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases/latest/download/hmip-plugin-weather-1.1.1.tar.gz)** â€” install via HCUweb â†’ *Developer mode â†’ Plugins â†’ Install from file*.

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

| Device                        | Shows                                              |
| ----------------------------- | -------------------------------------------------- |
| Weather <Location>            | Current readings                                   |
| Weather <Location> (today)    | Daily high temperature + aggregated daily values   |
| Weather <Location> (today, low) | Today's low temperature                          |
| Weather <Location> (tomorrow) | Tomorrow's high + forecast daily values            |
| Weather <Location> (tomorrow, low) | Tomorrow's low temperature                    |

The "today", "tomorrow" and "low" devices can be enabled or disabled individually
in the configuration.

## Install on your HCU

1. Download `hmip-plugin-weather-<version>.tar.gz` from the
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-webweather/releases).
2. In HCUweb open *Developer mode â†’ Plugins â†’ Upload* and select the file.
3. Configure under *Plugins â†’ Open-Meteo Weather â†’ Configure*.

## Build and install on the HCU

```bash
./build.sh    # Linux/macOS
# or
./build.ps1   # Windows
```

## Notes

- Open-Meteo is free for non-commercial use and does not need an API key.
- The lux estimate from solar radiation is approximate, and accuracy depends
  on the Open-Meteo model.
- `CLIMATE_SENSOR` is a sensor-only archetype. `CONTROL_REQUEST` is answered
  with `success: false`.

## References

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Open-Meteo API docs](https://open-meteo.com/en/docs)

## Author

Issued by **Fabio Renner**.

## License

Apache-2.0
