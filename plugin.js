// Homematic IP HCU Plugin: Open-Meteo Weather as CLIMATE_SENSOR
// Reference API: https://github.com/homematicip/connect-api
// Weather source: https://open-meteo.com/

"use strict";

const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const https = require("https");

// --------------------------------------------------------------------------
// Configuration — persisted in /data/config.json; first boot seeds from ENV.
// --------------------------------------------------------------------------
const CONFIG_DIR = process.env.WEATHER_DATA_DIR || "/data";
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG = {
	latitude: parseFloat(process.env.WEATHER_LAT || "52.5200"),     // Berlin
	longitude: parseFloat(process.env.WEATHER_LON || "13.4050"),
	locationName: process.env.WEATHER_LOCATION_NAME || "Open-Meteo",
	pollIntervalMs: parseInt(process.env.WEATHER_POLL_MS || "600000", 10),
	stormWindSpeedKmh: parseFloat(process.env.WEATHER_STORM_KMH || "62"),
	todayEnabled: (process.env.WEATHER_TODAY_ENABLED || "true").toLowerCase() !== "false",
	forecastEnabled: (process.env.WEATHER_FORECAST_ENABLED || "true").toLowerCase() !== "false",
	showMinTemperature: (process.env.WEATHER_SHOW_MIN || "true").toLowerCase() !== "false"
};

let config = { ...DEFAULT_CONFIG };

function loadConfig() {
	try {
		if (fs.existsSync(CONFIG_FILE)) {
			const raw = fs.readFileSync(CONFIG_FILE, "utf8");
			const parsed = JSON.parse(raw);
			config = { ...DEFAULT_CONFIG, ...parsed };
			console.log("[config] loaded from", CONFIG_FILE);
		} else {
			console.log("[config] no persisted config, using defaults");
		}
	} catch (e) {
		console.warn("[config] could not load, using defaults:", e.message);
	}
}

function saveConfig() {
	try {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
		fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
		console.log("[config] saved to", CONFIG_FILE);
	} catch (e) {
		console.warn("[config] could not save:", e.message);
	}
}

// --------------------------------------------------------------------------
// Device ids
// --------------------------------------------------------------------------
const DEVICE_ID_NOW = "open-meteo-climate-sensor-now";
const DEVICE_ID_TODAY = "open-meteo-climate-sensor-today";
const DEVICE_ID_TODAY_MIN = "open-meteo-climate-sensor-today-min";
const DEVICE_ID_TOMORROW = "open-meteo-climate-sensor-tomorrow";
const DEVICE_ID_TOMORROW_MIN = "open-meteo-climate-sensor-tomorrow-min";

const ALL_DEVICE_IDS = [
	DEVICE_ID_NOW,
	DEVICE_ID_TODAY,
	DEVICE_ID_TODAY_MIN,
	DEVICE_ID_TOMORROW,
	DEVICE_ID_TOMORROW_MIN
];

// Cached state per device -> turned into features on STATUS_REQUEST/STATUS_EVENT
const deviceState = {};
for (const id of ALL_DEVICE_IDS) deviceState[id] = buildDefaultFeatures();

function buildDefaultFeatures() {
	return {
		actualTemperature: null,
		humidity: null,
		windSpeed: null,
		windDirection: null,
		illumination: null,
		raining: false,
		storm: false,
		sunshine: false,
		rainCounter: 0,
		todayRainCounter: 0,
		yesterdayRainCounter: 0,
		// Flag: this device is a "minimum temperature only" variant. Only the
		// actualTemperature field is emitted for it.
		tempOnly: false
	};
}

// --------------------------------------------------------------------------
// Open-Meteo fetch
// --------------------------------------------------------------------------
function fetchJson(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, { headers: { "User-Agent": "hmip-plugin-weather/1.3" } }, (res) => {
				if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
					res.resume();
					return reject(new Error("HTTP " + res.statusCode + " for " + url));
				}
				let data = "";
				res.setEncoding("utf8");
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () => {
					try {
						resolve(JSON.parse(data));
					} catch (e) {
						reject(e);
					}
				});
			})
			.on("error", reject);
	});
}

async function fetchWeather() {
	const params = new URLSearchParams({
		latitude: String(config.latitude),
		longitude: String(config.longitude),
		current: [
			"temperature_2m",
			"relative_humidity_2m",
			"precipitation",
			"rain",
			"weather_code",
			"wind_speed_10m",
			"wind_direction_10m",
			"wind_gusts_10m",
			"shortwave_radiation",
			"is_day"
		].join(","),
		daily: [
			"weather_code",
			"temperature_2m_max",
			"temperature_2m_min",
			"temperature_2m_mean",
			"precipitation_sum",
			"wind_speed_10m_max",
			"wind_gusts_10m_max",
			"wind_direction_10m_dominant",
			"shortwave_radiation_sum"
		].join(","),
		hourly: "relative_humidity_2m",
		past_days: "1",
		forecast_days: "3",
		timezone: "auto",
		wind_speed_unit: "kmh"
	});
	const url = "https://api.open-meteo.com/v1/forecast?" + params.toString();
	return fetchJson(url);
}

// --------------------------------------------------------------------------
// Mapping helpers
// --------------------------------------------------------------------------
function clamp(value, min, max) {
	if (typeof value !== "number" || !isFinite(value)) return null;
	return Math.min(max, Math.max(min, value));
}

function radiationToLux(wPerM2, isDay) {
	if (typeof wPerM2 !== "number" || wPerM2 <= 0 || !isDay) return 0;
	const lux = wPerM2 * 120; // ~120 lm/W luminous efficacy of daylight
	return Math.min(20000, Math.max(0, lux));
}

function isClearSkyCode(code) {
	return code === 0 || code === 1;
}

function isThunderstormCode(code) {
	return code === 95 || code === 96 || code === 99;
}

function averageDailyHumidity(hourly, dateString) {
	if (!hourly || !Array.isArray(hourly.time) || !Array.isArray(hourly.relative_humidity_2m)) return null;
	let sum = 0;
	let count = 0;
	for (let i = 0; i < hourly.time.length; i++) {
		const t = hourly.time[i];
		if (typeof t === "string" && t.startsWith(dateString)) {
			const v = hourly.relative_humidity_2m[i];
			if (typeof v === "number" && isFinite(v)) {
				sum += v;
				count++;
			}
		}
	}
	return count > 0 ? sum / count : null;
}

// --------------------------------------------------------------------------
// "Now" mapping
// --------------------------------------------------------------------------
function updateNowFeaturesFrom(openMeteo) {
	const cur = openMeteo && openMeteo.current ? openMeteo.current : {};
	const daily = openMeteo && openMeteo.daily ? openMeteo.daily : {};

	const temp = clamp(cur.temperature_2m, -50, 60);
	const humidityRaw = clamp(cur.relative_humidity_2m, 0, 100);
	const humidity = humidityRaw == null ? null : Math.round(humidityRaw);
	const windSpeed = clamp(cur.wind_speed_10m, 0, 400);
	const windGust = clamp(cur.wind_gusts_10m, 0, 400);
	const windDir = clamp(cur.wind_direction_10m, 0, 359);
	const illumination = clamp(radiationToLux(cur.shortwave_radiation, cur.is_day === 1), 0, 20000);

	const rainMm = typeof cur.rain === "number" ? cur.rain : typeof cur.precipitation === "number" ? cur.precipitation : 0;
	const raining = rainMm > 0;

	const code = cur.weather_code;
	const sunshine = cur.is_day === 1 && isClearSkyCode(code);
	const effectiveWind = windGust != null ? windGust : windSpeed;
	const storm = (effectiveWind != null && effectiveWind >= config.stormWindSpeedKmh) || isThunderstormCode(code);

	let todayRain = 0;
	let yesterdayRain = 0;
	if (daily && Array.isArray(daily.precipitation_sum) && daily.precipitation_sum.length >= 2) {
		yesterdayRain = Number(daily.precipitation_sum[0]) || 0;
		todayRain = Number(daily.precipitation_sum[1]) || 0;
	} else if (daily && Array.isArray(daily.precipitation_sum) && daily.precipitation_sum.length === 1) {
		todayRain = Number(daily.precipitation_sum[0]) || 0;
	}

	deviceState[DEVICE_ID_NOW] = {
		...buildDefaultFeatures(),
		actualTemperature: temp,
		humidity: humidity,
		windSpeed: windSpeed,
		windDirection: windDir,
		illumination: illumination,
		raining: raining,
		storm: storm,
		sunshine: sunshine,
		rainCounter: Math.max(0, yesterdayRain + todayRain),
		todayRainCounter: Math.max(0, todayRain),
		yesterdayRainCounter: Math.max(0, yesterdayRain)
	};
}

// --------------------------------------------------------------------------
// Daily mapping (today or tomorrow) — shared helper.
// idx: offset into daily.time (with past_days=1, 1=today, 2=tomorrow).
// --------------------------------------------------------------------------
function buildDailySummary(openMeteo, idx) {
	const daily = openMeteo && openMeteo.daily ? openMeteo.daily : {};
	const hourly = openMeteo && openMeteo.hourly ? openMeteo.hourly : null;

	if (!daily || !Array.isArray(daily.time) || daily.time.length <= idx) {
		return { max: buildDefaultFeatures(), min: buildDefaultFeatures() };
	}

	const dateString = daily.time[idx];
	const code = daily.weather_code && daily.weather_code[idx];
	const tMax = daily.temperature_2m_max && daily.temperature_2m_max[idx];
	const tMin = daily.temperature_2m_min && daily.temperature_2m_min[idx];
	const windMax = daily.wind_speed_10m_max && daily.wind_speed_10m_max[idx];
	const gustMax = daily.wind_gusts_10m_max && daily.wind_gusts_10m_max[idx];
	const windDir = daily.wind_direction_10m_dominant && daily.wind_direction_10m_dominant[idx];
	const precipSum = daily.precipitation_sum && daily.precipitation_sum[idx];
	const radiationSum = daily.shortwave_radiation_sum && daily.shortwave_radiation_sum[idx];

	// Daily shortwave_radiation_sum is MJ/m². Rough peak W/m² over an 8h productive window.
	const peakWPerM2 = typeof radiationSum === "number" ? (radiationSum * 1e6) / (8 * 3600) : null;
	const illumination = peakWPerM2 != null ? clamp(radiationToLux(peakWPerM2, true), 0, 20000) : null;

	const humidityAvg = averageDailyHumidity(hourly, dateString);
	const humidity = humidityAvg == null ? null : Math.round(clamp(humidityAvg, 0, 100));

	const effectiveWind = typeof gustMax === "number" ? gustMax : windMax;
	const storm = (typeof effectiveWind === "number" && effectiveWind >= config.stormWindSpeedKmh) || isThunderstormCode(code);
	const expectedRain = typeof precipSum === "number" ? precipSum : 0;
	const raining = expectedRain > 0;
	const sunshine = isClearSkyCode(code);

	const max = {
		...buildDefaultFeatures(),
		actualTemperature: clamp(tMax, -50, 60),
		humidity: humidity,
		windSpeed: clamp(windMax, 0, 400),
		windDirection: clamp(windDir, 0, 359),
		illumination: illumination,
		raining: raining,
		storm: storm,
		sunshine: sunshine,
		rainCounter: Math.max(0, expectedRain),
		todayRainCounter: Math.max(0, expectedRain),
		yesterdayRainCounter: 0
	};

	const min = {
		...buildDefaultFeatures(),
		actualTemperature: clamp(tMin, -50, 60),
		tempOnly: true
	};

	return { max, min };
}

function updateTodayFeaturesFrom(openMeteo) {
	const { max, min } = buildDailySummary(openMeteo, 1);
	deviceState[DEVICE_ID_TODAY] = max;
	deviceState[DEVICE_ID_TODAY_MIN] = min;
}

function updateTomorrowFeaturesFrom(openMeteo) {
	const { max, min } = buildDailySummary(openMeteo, 2);
	deviceState[DEVICE_ID_TOMORROW] = max;
	deviceState[DEVICE_ID_TOMORROW_MIN] = min;
}

// --------------------------------------------------------------------------
// Feature / device serialization
// --------------------------------------------------------------------------
function serializeFeatures(deviceId) {
	const f = deviceState[deviceId];
	const out = [];

	if (f.actualTemperature != null) out.push({ type: "actualTemperature", actualTemperature: f.actualTemperature });

	// Min-temperature-only devices expose nothing else.
	if (f.tempOnly) return out;

	if (f.humidity != null) out.push({ type: "humidity", humidity: f.humidity });
	if (f.windSpeed != null) out.push({ type: "windSpeed", windSpeed: f.windSpeed });
	if (f.windDirection != null) out.push({ type: "windDirection", windDirection: f.windDirection });
	if (f.illumination != null) out.push({ type: "illumination", illumination: f.illumination });

	out.push({ type: "raining", raining: !!f.raining });
	out.push({ type: "storm", storm: !!f.storm });
	out.push({ type: "sunshine", sunshine: !!f.sunshine });
	out.push({
		type: "rainCount",
		rainCounter: f.rainCounter || 0,
		todayRainCounter: f.todayRainCounter || 0,
		yesterdayRainCounter: f.yesterdayRainCounter || 0
	});

	return out;
}

function buildDevices() {
	const devices = [
		{
			deviceType: "CLIMATE_SENSOR",
			deviceId: DEVICE_ID_NOW,
			firmwareVersion: "1.3.0",
			friendlyName: "Wetter " + config.locationName,
			modelType: "OPEN_METEO_SENSOR",
			features: serializeFeatures(DEVICE_ID_NOW)
		}
	];

	if (config.todayEnabled) {
		devices.push({
			deviceType: "CLIMATE_SENSOR",
			deviceId: DEVICE_ID_TODAY,
			firmwareVersion: "1.3.0",
			friendlyName: "Wetter " + config.locationName + " (heute)",
			modelType: "OPEN_METEO_TODAY",
			features: serializeFeatures(DEVICE_ID_TODAY)
		});
		if (config.showMinTemperature) {
			devices.push({
				deviceType: "CLIMATE_SENSOR",
				deviceId: DEVICE_ID_TODAY_MIN,
				firmwareVersion: "1.3.0",
				friendlyName: "Wetter " + config.locationName + " (heute, Tief)",
				modelType: "OPEN_METEO_TODAY_MIN",
				features: serializeFeatures(DEVICE_ID_TODAY_MIN)
			});
		}
	}

	if (config.forecastEnabled) {
		devices.push({
			deviceType: "CLIMATE_SENSOR",
			deviceId: DEVICE_ID_TOMORROW,
			firmwareVersion: "1.3.0",
			friendlyName: "Wetter " + config.locationName + " (morgen)",
			modelType: "OPEN_METEO_FORECAST",
			features: serializeFeatures(DEVICE_ID_TOMORROW)
		});
		if (config.showMinTemperature) {
			devices.push({
				deviceType: "CLIMATE_SENSOR",
				deviceId: DEVICE_ID_TOMORROW_MIN,
				firmwareVersion: "1.3.0",
				friendlyName: "Wetter " + config.locationName + " (morgen, Tief)",
				modelType: "OPEN_METEO_FORECAST_MIN",
				features: serializeFeatures(DEVICE_ID_TOMORROW_MIN)
			});
		}
	}

	return devices;
}

// --------------------------------------------------------------------------
// Config template shown in HCUweb
// --------------------------------------------------------------------------
function configTemplate(languageCode) {
	const de = (languageCode || "").toLowerCase().startsWith("de");
	const t = (deText, enText) => (de ? deText : enText);

	return {
		groups: {
			location: {
				friendlyName: t("Standort", "Location"),
				description: t(
					"Koordinaten des Ortes, für den Wetterdaten abgerufen werden.",
					"Coordinates for which weather data is fetched."
				),
				order: 1
			},
			devices: {
				friendlyName: t("Geräte", "Devices"),
				description: t(
					"Welche Sensoren in der App angelegt werden sollen.",
					"Which sensors should be exposed to the app."
				),
				order: 2
			},
			behaviour: {
				friendlyName: t("Verhalten", "Behaviour"),
				description: t(
					"Aktualisierungsrhythmus und Schwellwerte.",
					"Update cadence and thresholds."
				),
				order: 3
			}
		},
		properties: {
			latitude: {
				dataType: "NUMBER",
				friendlyName: t("Breitengrad", "Latitude"),
				description: t(
					"Breitengrad in Dezimalgrad, z.B. 52.52 für Berlin.",
					"Latitude in decimal degrees, e.g. 52.52 for Berlin."
				),
				minimum: -90,
				maximum: 90,
				defaultValue: DEFAULT_CONFIG.latitude,
				currentValue: config.latitude,
				required: true,
				groupId: "location",
				order: 1
			},
			longitude: {
				dataType: "NUMBER",
				friendlyName: t("Längengrad", "Longitude"),
				description: t(
					"Längengrad in Dezimalgrad, z.B. 13.405 für Berlin.",
					"Longitude in decimal degrees, e.g. 13.405 for Berlin."
				),
				minimum: -180,
				maximum: 180,
				defaultValue: DEFAULT_CONFIG.longitude,
				currentValue: config.longitude,
				required: true,
				groupId: "location",
				order: 2
			},
			locationName: {
				dataType: "STRING",
				friendlyName: t("Ortsname", "Location name"),
				description: t(
					"Wird im Gerätenamen in der App angezeigt.",
					"Shown in the device name inside the app."
				),
				minimumLength: 1,
				maximumLength: 40,
				defaultValue: DEFAULT_CONFIG.locationName,
				currentValue: config.locationName,
				required: true,
				groupId: "location",
				order: 3
			},
			todayEnabled: {
				dataType: "BOOLEAN",
				friendlyName: t("Gerät für heute", "Today device"),
				description: t(
					"Gerät mit den Tageswerten von heute (Höchsttemperatur, Regenmenge, Wind-Maximum).",
					"Expose a device with today's aggregated values (peak temperature, rainfall, wind maximum)."
				),
				defaultValue: DEFAULT_CONFIG.todayEnabled,
				currentValue: config.todayEnabled,
				required: true,
				groupId: "devices",
				order: 1
			},
			forecastEnabled: {
				dataType: "BOOLEAN",
				friendlyName: t("Gerät für morgen", "Tomorrow device"),
				description: t(
					"Gerät mit der Vorhersage für morgen (Höchsttemperatur, erwartete Regenmenge, Wind-Maximum).",
					"Expose a device with tomorrow's forecast (peak temperature, expected rainfall, wind maximum)."
				),
				defaultValue: DEFAULT_CONFIG.forecastEnabled,
				currentValue: config.forecastEnabled,
				required: true,
				groupId: "devices",
				order: 2
			},
			showMinTemperature: {
				dataType: "BOOLEAN",
				friendlyName: t("Tiefsttemperatur anzeigen", "Show minimum temperature"),
				description: t(
					"Zusätzliche Geräte für die Tiefsttemperatur von heute und morgen anlegen.",
					"Expose additional devices with the daily minimum temperature for today and tomorrow."
				),
				defaultValue: DEFAULT_CONFIG.showMinTemperature,
				currentValue: config.showMinTemperature,
				required: true,
				groupId: "devices",
				order: 3
			},
			pollIntervalMs: {
				dataType: "INTEGER",
				friendlyName: t("Abfrageintervall (ms)", "Poll interval (ms)"),
				description: t(
					"Abstand zwischen Abfragen an Open-Meteo, mindestens 60000 ms (1 min).",
					"Interval between calls to Open-Meteo, minimum 60000 ms (1 min)."
				),
				minimum: 60000,
				maximum: 3600000,
				defaultValue: DEFAULT_CONFIG.pollIntervalMs,
				currentValue: config.pollIntervalMs,
				required: true,
				groupId: "behaviour",
				order: 1
			},
			stormWindSpeedKmh: {
				dataType: "NUMBER",
				friendlyName: t("Sturm-Schwelle (km/h)", "Storm threshold (km/h)"),
				description: t(
					"Ab dieser Böen-Geschwindigkeit wird das Storm-Flag gesetzt.",
					"Wind gust speed above which the storm flag is raised."
				),
				minimum: 20,
				maximum: 200,
				defaultValue: DEFAULT_CONFIG.stormWindSpeedKmh,
				currentValue: config.stormWindSpeedKmh,
				required: true,
				groupId: "behaviour",
				order: 2
			}
		}
	};
}

function coerceConfigUpdate(updates) {
	// HCU sends the raw form values. Coerce and validate. Returns {newConfig, errors[]}.
	const next = { ...config };
	const errors = [];

	function setNumber(key, value, min, max) {
		const n = typeof value === "number" ? value : parseFloat(value);
		if (!isFinite(n)) return errors.push(key + ": not a number");
		if (typeof min === "number" && n < min) return errors.push(key + ": below minimum " + min);
		if (typeof max === "number" && n > max) return errors.push(key + ": above maximum " + max);
		next[key] = n;
	}

	function setInt(key, value, min, max) {
		const n = parseInt(value, 10);
		if (!isFinite(n)) return errors.push(key + ": not an integer");
		if (typeof min === "number" && n < min) return errors.push(key + ": below minimum " + min);
		if (typeof max === "number" && n > max) return errors.push(key + ": above maximum " + max);
		next[key] = n;
	}

	function setString(key, value, minLen, maxLen) {
		if (typeof value !== "string") return errors.push(key + ": not a string");
		const v = value.trim();
		if (v.length < minLen) return errors.push(key + ": too short");
		if (v.length > maxLen) return errors.push(key + ": too long");
		next[key] = v;
	}

	function setBool(key, value) {
		if (typeof value === "boolean") next[key] = value;
		else if (value === "true") next[key] = true;
		else if (value === "false") next[key] = false;
		else errors.push(key + ": not a boolean");
	}

	if (updates.latitude !== undefined) setNumber("latitude", updates.latitude, -90, 90);
	if (updates.longitude !== undefined) setNumber("longitude", updates.longitude, -180, 180);
	if (updates.locationName !== undefined) setString("locationName", updates.locationName, 1, 40);
	if (updates.todayEnabled !== undefined) setBool("todayEnabled", updates.todayEnabled);
	if (updates.forecastEnabled !== undefined) setBool("forecastEnabled", updates.forecastEnabled);
	if (updates.showMinTemperature !== undefined) setBool("showMinTemperature", updates.showMinTemperature);
	if (updates.pollIntervalMs !== undefined) setInt("pollIntervalMs", updates.pollIntervalMs, 60000, 3600000);
	if (updates.stormWindSpeedKmh !== undefined) setNumber("stormWindSpeedKmh", updates.stormWindSpeedKmh, 20, 200);

	return { newConfig: next, errors: errors };
}

// --------------------------------------------------------------------------
// Plugin lifecycle
// --------------------------------------------------------------------------
async function start(pluginId, host, authtokenFile) {
	loadConfig();

	const authtoken = (await fsp.readFile(authtokenFile, "utf8")).trim();

	// Prime the cache so DISCOVER_RESPONSE has real numbers before the first push.
	try {
		const initial = await fetchWeather();
		updateNowFeaturesFrom(initial);
		updateTodayFeaturesFrom(initial);
		updateTomorrowFeaturesFrom(initial);
		console.log("[weather] initial data loaded for", config.latitude, config.longitude);
	} catch (err) {
		console.warn("[weather] initial fetch failed:", err.message);
	}

	let pollTimer = null;
	const webSocket = new WebSocket("wss://" + host + ":9001", {
		rejectUnauthorized: false,
		headers: {
			authtoken: authtoken,
			"plugin-id": pluginId
		}
	});

	function send(message) {
		try {
			webSocket.send(JSON.stringify(message));
			console.log("Sent:", message.type);
		} catch (e) {
			console.error("send failed:", e.message);
		}
	}

	function sendPluginReady(messageId) {
		send({
			id: messageId,
			pluginId: pluginId,
			type: "PLUGIN_STATE_RESPONSE",
			body: { pluginReadinessStatus: "READY" }
		});
	}

	function sendDiscoverResponse(messageId) {
		send({
			id: messageId,
			pluginId: pluginId,
			type: "DISCOVER_RESPONSE",
			body: { success: true, devices: buildDevices() }
		});
	}

	function sendStatusResponse(messageId) {
		send({
			id: messageId,
			pluginId: pluginId,
			type: "STATUS_RESPONSE",
			body: { success: true, devices: buildDevices() }
		});
	}

	function sendStatusEvents() {
		for (const device of buildDevices()) {
			send({
				id: uuidv4(),
				pluginId: pluginId,
				type: "STATUS_EVENT",
				body: { deviceId: device.deviceId, features: device.features }
			});
		}
	}

	function sendConfigTemplateResponse(messageId, languageCode) {
		send({
			id: messageId,
			pluginId: pluginId,
			type: "CONFIG_TEMPLATE_RESPONSE",
			body: configTemplate(languageCode)
		});
	}

	function sendConfigUpdateResponse(messageId, status, message) {
		const body = { status: status };
		if (message) body.message = message;
		send({
			id: messageId,
			pluginId: pluginId,
			type: "CONFIG_UPDATE_RESPONSE",
			body: body
		});
	}

	function schedulePolling() {
		if (pollTimer) clearInterval(pollTimer);
		pollTimer = setInterval(pollAndPush, config.pollIntervalMs);
	}

	async function pollAndPush() {
		try {
			const data = await fetchWeather();
			updateNowFeaturesFrom(data);
			updateTodayFeaturesFrom(data);
			updateTomorrowFeaturesFrom(data);
			if (webSocket.readyState === WebSocket.OPEN) {
				sendStatusEvents();
			}
		} catch (err) {
			console.warn("[weather] poll failed:", err.message);
		}
	}

	async function handleConfigUpdate(message) {
		const body = message.body || {};
		const { newConfig, errors } = coerceConfigUpdate(body.properties || {});
		if (errors.length > 0) {
			sendConfigUpdateResponse(message.id, "FAILED", errors.join("; "));
			return;
		}

		config = newConfig;
		saveConfig();

		try {
			const data = await fetchWeather();
			updateNowFeaturesFrom(data);
			updateTodayFeaturesFrom(data);
			updateTomorrowFeaturesFrom(data);
			schedulePolling();
			if (webSocket.readyState === WebSocket.OPEN) sendStatusEvents();
			sendConfigUpdateResponse(message.id, "APPLIED");
		} catch (err) {
			sendConfigUpdateResponse(
				message.id,
				"FAILED",
				"Konfiguration gespeichert, aber Abruf bei Open-Meteo fehlgeschlagen: " + err.message
			);
		}
	}

	webSocket.on("open", () => {
		console.log("Connected to HCU WebSocket");
		sendPluginReady(uuidv4());
		schedulePolling();
	});

	webSocket.on("message", (data) => {
		let message;
		try {
			message = JSON.parse(data);
		} catch (e) {
			console.error("Invalid message:", e.message);
			return;
		}
		console.log("Received:", message.type);

		switch (message.type) {
			case "PLUGIN_STATE_REQUEST":
				sendPluginReady(message.id);
				break;
			case "DISCOVER_REQUEST":
				sendDiscoverResponse(message.id);
				setTimeout(() => {
					if (webSocket.readyState === WebSocket.OPEN) sendStatusEvents();
				}, 500);
				break;
			case "STATUS_REQUEST":
				sendStatusResponse(message.id);
				break;
			case "CONFIG_TEMPLATE_REQUEST":
				sendConfigTemplateResponse(message.id, (message.body && message.body.languageCode) || "de");
				break;
			case "CONFIG_UPDATE_REQUEST":
				handleConfigUpdate(message).catch((err) => {
					console.error("config update error:", err);
					sendConfigUpdateResponse(message.id, "FAILED", err.message || "unknown error");
				});
				break;
			case "CONTROL_REQUEST":
				send({
					id: message.id,
					pluginId: pluginId,
					type: "CONTROL_RESPONSE",
					body: {
						deviceId: (message.body && message.body.deviceId) || DEVICE_ID_NOW,
						success: false
					}
				});
				break;
			default:
				break;
		}
	});

	webSocket.on("close", (code, reason) => {
		console.warn("WebSocket closed:", code, reason && reason.toString());
		if (pollTimer) clearInterval(pollTimer);
	});

	webSocket.on("error", (err) => {
		console.error("WebSocket error:", err.code || "", err.message || err);
	});
}

// --------------------------------------------------------------------------
// Entrypoint
// --------------------------------------------------------------------------
const args = process.argv.slice(2);
const pluginId = args[0];
const host = args[1];
const authtokenFile = args[2];

if (!pluginId || !host || !authtokenFile) {
	console.error("Usage: node plugin.js <plugin-id> <hcu-host> <authtoken-file>");
	process.exit(1);
}

start(pluginId, host, authtokenFile).catch((err) => {
	console.error("Plugin startup failed:", err);
	process.exit(1);
});
