"use strict";

(() => {
  /* ==================================================
     CONSTANTS
     ================================================== */

  const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast";

  const CURRENT_PARAMS =
    "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,pressure_msl,wind_speed_10m,precipitation";
  const HOURLY_PARAMS =
    "temperature_2m,weather_code,visibility,uv_index,dew_point_2m,precipitation_probability,cloud_cover";
  const DAILY_PARAMS =
    "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max";

  const DEFAULT_CITY = "London";
  const HISTORY_STORAGE_KEY = "weatherpro-history";
  const THEME_STORAGE_KEY = "weatherpro-theme";
  const MAX_HISTORY_ITEMS = 8;
  const TOAST_LIFETIME_MS = 3200;

  /* Reusable weather-code mapping. Every Open-Meteo WMO code
     resolves to a description, an icon category, and a
     background theme (matching body[data-weather-theme]). */
  const WEATHER_CODE_MAP = {
    0: { description: "Clear Sky", category: "clear", theme: "sunny" },
    1: { description: "Mainly Clear", category: "clear", theme: "sunny" },
    2: { description: "Partly Cloudy", category: "cloudy", theme: "cloudy" },
    3: { description: "Overcast", category: "cloudy", theme: "cloudy" },
    45: { description: "Foggy", category: "fog", theme: "cloudy" },
    48: { description: "Rime Fog", category: "fog", theme: "cloudy" },
    51: { description: "Light Drizzle", category: "rain", theme: "rain" },
    53: { description: "Moderate Drizzle", category: "rain", theme: "rain" },
    55: { description: "Dense Drizzle", category: "rain", theme: "rain" },
    56: { description: "Freezing Drizzle", category: "rain", theme: "rain" },
    57: { description: "Freezing Drizzle", category: "rain", theme: "rain" },
    61: { description: "Slight Rain", category: "rain", theme: "rain" },
    63: { description: "Moderate Rain", category: "rain", theme: "rain" },
    65: { description: "Heavy Rain", category: "rain", theme: "rain" },
    66: { description: "Freezing Rain", category: "rain", theme: "rain" },
    67: { description: "Freezing Rain", category: "rain", theme: "rain" },
    71: { description: "Slight Snow", category: "snow", theme: "snow" },
    73: { description: "Moderate Snow", category: "snow", theme: "snow" },
    75: { description: "Heavy Snow", category: "snow", theme: "snow" },
    77: { description: "Snow Grains", category: "snow", theme: "snow" },
    80: { description: "Rain Showers", category: "rain", theme: "rain" },
    81: { description: "Rain Showers", category: "rain", theme: "rain" },
    82: { description: "Violent Showers", category: "rain", theme: "rain" },
    85: { description: "Snow Showers", category: "snow", theme: "snow" },
    86: { description: "Snow Showers", category: "snow", theme: "snow" },
    95: { description: "Thunderstorm", category: "storm", theme: "storm" },
    96: { description: "Thunderstorm w/ Hail", category: "storm", theme: "storm" },
    99: { description: "Thunderstorm w/ Hail", category: "storm", theme: "storm" },
  };

  const DEFAULT_WEATHER_INFO = { description: "Unknown", category: "cloudy", theme: "cloudy" };
  const getWeatherInfo = (code) => WEATHER_CODE_MAP[code] || DEFAULT_WEATHER_INFO;

 

  const ICON_PARTS = {
    sun: `<g class="icon-sun"><circle cx="60" cy="52" r="23"></circle><g stroke-width="4" stroke-linecap="round"><line x1="60" y1="8" x2="60" y2="18"></line><line x1="60" y1="86" x2="60" y2="96"></line><line x1="14" y1="52" x2="24" y2="52"></line><line x1="96" y1="52" x2="106" y2="52"></line><line x1="29" y1="21" x2="36" y2="28"></line><line x1="84" y1="76" x2="91" y2="83"></line><line x1="91" y1="21" x2="84" y2="28"></line><line x1="36" y1="76" x2="29" y2="83"></line></g></g>`,
moon: `
<g class="icon-moon">
    <circle cx="60" cy="55" r="22"></circle>
    <circle cx="69" cy="47" r="20" fill="white"></circle>
</g>
`,
    cloud: `<g class="icon-cloud"><ellipse cx="45" cy="70" rx="22" ry="16"></ellipse><ellipse cx="68" cy="60" rx="27" ry="21"></ellipse><ellipse cx="88" cy="72" rx="17" ry="13"></ellipse><rect x="34" y="70" width="63" height="20" rx="10"></rect></g>`,
    rain: `<g class="icon-rain" stroke-width="4" stroke-linecap="round"><line x1="45" y1="94" x2="40" y2="107"></line><line x1="62" y1="97" x2="57" y2="110"></line><line x1="79" y1="94" x2="74" y2="107"></line></g>`,
    snow: `<g class="icon-snow"><circle cx="45" cy="97" r="3.6"></circle><circle cx="62" cy="101" r="3.6"></circle><circle cx="79" cy="97" r="3.6"></circle></g>`,
    lightning: `<polygon class="icon-lightning" points="70,78 56,100 65,100 54,118 80,92 69,92 79,78"></polygon>`,
  };

  const buildIconInner = (category, isDay) => {
    switch (category) {
      case "clear":
        return isDay ? ICON_PARTS.sun : ICON_PARTS.moon;
      case "cloudy":
      case "fog":
        return `${isDay ? ICON_PARTS.sun : ICON_PARTS.moon}${ICON_PARTS.cloud}`;
      case "rain":
        return `${ICON_PARTS.cloud}${ICON_PARTS.rain}`;
      case "snow":
        return `${ICON_PARTS.cloud}${ICON_PARTS.snow}`;
      case "storm":
        return `${ICON_PARTS.cloud}${ICON_PARTS.lightning}`;
      default:
        return isDay ? ICON_PARTS.sun : ICON_PARTS.moon;
    }
  };

  const buildWeatherSvg = (category, isDay) =>
`
<svg
    class="weather-svg"
    viewBox="0 0 120 120"
    width="120"
    height="120"
    preserveAspectRatio="xMidYMid meet"
>
${buildIconInner(category,isDay)}
</svg>
`;

  const HISTORY_ICON_SVG =
    '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 5 5"></path></svg>';
  const DROPLET_ICON_SVG =
    '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.2 6 11a6 6 0 1 1-12 0c0-4.8 6-11 6-11Z"></path></svg>';
  const TOAST_ICONS = {
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7v.1"></path></svg>',
    success: '<svg viewBox="0 0 24 24"><path d="m5 13 4 4 10-10"></path></svg>',
    error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 16v.1"></path></svg>',
  };

  /* ==================================================
     DOM REFERENCES
     ================================================== */

  const elements = {
    loadingScreen: document.getElementById("loadingScreen"),
    loadingMessage: document.getElementById("loadingMessage"),

    locationButton: document.getElementById("locationButton"),
    themeToggle: document.getElementById("themeToggle"),

    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("searchInput"),
    voiceSearchButton: document.getElementById("voiceSearchButton"),
    searchButton: document.getElementById("searchButton"),

    searchHistory: document.getElementById("searchHistory"),
    historyCount: document.getElementById("historyCount"),
    clearHistoryButton: document.getElementById("clearHistoryButton"),
    historyList: document.getElementById("historyList"),

    errorContainer: document.getElementById("errorContainer"),
    errorTitle: document.getElementById("errorTitle"),
    errorMessage: document.getElementById("errorMessage"),
    errorDismissButton: document.getElementById("errorDismissButton"),

    dashboard: document.getElementById("dashboard"),

    cityName: document.getElementById("currentWeatherTitle"),
    countryName: document.getElementById("countryName"),
    currentDate: document.getElementById("currentDate"),
    currentTime: document.getElementById("currentTime"),
    currentWeatherIcon: document.getElementById("currentWeatherIcon"),
    currentCondition: document.getElementById("currentCondition"),
    currentTemperature: document.getElementById("currentTemperature"),
    feelsLike: document.getElementById("feelsLike"),
    weatherSummaryText: document.getElementById("weatherSummaryText"),

    refreshButton: document.getElementById("refreshButton"),

    humidityValue: document.getElementById("humidityValue"),
    windValue: document.getElementById("windValue"),
    pressureValue: document.getElementById("pressureValue"),
    visibilityValue: document.getElementById("visibilityValue"),
    uvValue: document.getElementById("uvValue"),
    cloudValue: document.getElementById("cloudValue"),
    dewPointValue: document.getElementById("dewPointValue"),
    rainValue: document.getElementById("rainValue"),
    sunriseValue: document.getElementById("sunriseValue"),
    sunsetValue: document.getElementById("sunsetValue"),

    hourlyPrevButton: document.getElementById("hourlyPrevButton"),
    hourlyForecast: document.getElementById("hourlyForecast"),
    hourlyNextButton: document.getElementById("hourlyNextButton"),

    dailyForecast: document.getElementById("dailyForecast"),

    chartLocation: document.getElementById("chartLocation"),
    temperatureChart: document.getElementById("temperatureChart"),
    chartEmpty: document.getElementById("chartEmpty"),

    toastContainer: document.getElementById("toastContainer"),

    weatherLoadingOverlay: document.getElementById("weatherLoadingOverlay"),
    weatherLoadingText: document.getElementById("weatherLoadingText"),
  };

  /* ==================================================
     MODULE STATE
     ================================================== */

  let temperatureChartInstance = null;
  let speechRecognizer = null;
  let isVoiceListening = false;

  /* Snapshot of the most recently rendered city — used by the
     refresh button so it doesn't need to re-geocode. */
  let currentWeatherState = null;

  /* ==================================================
     LOCAL STORAGE HELPERS
     ================================================== */

  const readStorage = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* Storage may be unavailable (private browsing, quota, etc.) — fail silently. */
    }
  };

  /* ==================================================
     UTILITY / FORMATTING FUNCTIONS
     ================================================== */

  const WEEKDAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const WEEKDAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* Shared 12-hour conversion used by formatTime/formatHourLabel. */
  const to12Hour = (date) => {
    const period = date.getHours() >= 12 ? "PM" : "AM";
    const hours = date.getHours() % 12 || 12;
    return { hours, period };
  };

  const formatTime = (isoString) => {
    if (!isoString) return "--";
    const date = new Date(isoString);
    const { hours, period } = to12Hour(date);
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes} ${period}`;
  };

  const formatHourLabel = (isoString) => {
    if (!isoString) return "--";
    const { hours, period } = to12Hour(new Date(isoString));
    return `${hours} ${period}`;
  };

  const formatDateLabel = (isoString) => {
    if (!isoString) return "--";
    const date = new Date(isoString);
    return `${WEEKDAY_NAMES_LONG[date.getDay()]}, ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}`;
  };

  const formatDayLabel = (isoString) => {
    if (!isoString) return "--";
    return WEEKDAY_NAMES_SHORT[new Date(isoString).getDay()];
  };

  const formatShortDate = (isoString) => {
    if (!isoString) return "--";
    const date = new Date(isoString);
    return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}`;
  };

  const round = (value) => (Number.isFinite(value) ? Math.round(value) : null);

  /* Open-Meteo's "current.time" does not always exactly match an
     entry in the hourly "time" array (rounding differences between
     models). Finding the closest timestamp instead of relying on
     indexOf() keeps visibility/UV/dew point/rain chance from
     silently falling back to "--" whenever the exact string differs. */
  const findClosestHourlyIndex = (times, targetIso) => {
    if (!times || times.length === 0) return -1;
    const exactIndex = times.indexOf(targetIso);
    if (exactIndex !== -1) return exactIndex;

    const targetMs = new Date(targetIso).getTime();
    if (Number.isNaN(targetMs)) return 0;

    let closestIndex = 0;
    let smallestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  /* ==================================================
     TOAST NOTIFICATIONS
     ================================================== */

  const showToast = (message, type = "info") => {
    if (!elements.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast${type === "error" ? " is-error" : type === "success" ? " is-success" : ""}`;
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
      <span>${message}</span>
    `;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("is-leaving");
      setTimeout(() => toast.remove(), 260);
    }, TOAST_LIFETIME_MS);
  };

  /* ==================================================
     ERROR HANDLING
     ================================================== */

  const showError = (message, title = "Something went wrong") => {
    if (!elements.errorContainer) return;
    if (elements.errorTitle) elements.errorTitle.textContent = title;
    if (elements.errorMessage) elements.errorMessage.textContent = message;
    elements.errorContainer.hidden = false;
  };

  const clearError = () => {
    if (!elements.errorContainer) return;
    elements.errorContainer.hidden = true;
  };

  /* ==================================================
     LOADING STATE HELPERS
     ================================================== */

  const hideInitialLoadingScreen = () => {
    if (!elements.loadingScreen) return;
    elements.loadingScreen.classList.add("is-hidden");
  };

  const showWeatherLoading = (message = "Updating weather…") => {
    if (!elements.weatherLoadingOverlay) return;
    if (elements.weatherLoadingText) elements.weatherLoadingText.textContent = message;
    elements.weatherLoadingOverlay.hidden = false;
  };

  const hideWeatherLoading = () => {
    if (!elements.weatherLoadingOverlay) return;
    elements.weatherLoadingOverlay.hidden = true;
  };

  /* ==================================================
     THEME (LIGHT / DARK)
     ================================================== */

  const applyTheme = (theme) => {
    document.body.dataset.theme = theme;
    if (elements.themeToggle) {
      elements.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
  };

  const toggleTheme = () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    writeStorage(THEME_STORAGE_KEY, nextTheme);
  };

  const initializeTheme = () => {
    const storedTheme = readStorage(THEME_STORAGE_KEY, null);
    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
    }
  };

  /* ==================================================
     BACKGROUND & ICON HANDLING
     ================================================== */

  const changeBackground = (weatherCode, isDay) => {
    const info = getWeatherInfo(weatherCode);
    document.body.dataset.weatherTheme = isDay ? info.theme : "night";
  };

  const changeWeatherIcon = (weatherCode, isDay) => {
    if (!elements.currentWeatherIcon) return;
    const info = getWeatherInfo(weatherCode);
    elements.currentWeatherIcon.innerHTML = buildWeatherSvg(info.category, isDay);
    elements.currentWeatherIcon.setAttribute("aria-label", info.description);
    elements.currentWeatherIcon.setAttribute("title", info.description);
  };

  /* ==================================================
     SEARCH HISTORY
     ================================================== */

  const getHistory = () => readStorage(HISTORY_STORAGE_KEY, []);

  const renderHistory = () => {
    const history = getHistory();

    if (elements.historyCount) elements.historyCount.textContent = history.length;
    if (!elements.searchHistory || !elements.historyList) return;

    elements.searchHistory.hidden = history.length === 0;
    elements.historyList.innerHTML = "";

    history.forEach((entry) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "history-item";
      item.innerHTML = `${HISTORY_ICON_SVG}<span>${entry.name}${entry.country ? `, ${entry.country}` : ""}</span>`;
      item.addEventListener("click", () => {
        fetchWeather(entry.latitude, entry.longitude, entry.name, entry.country);
      });
      elements.historyList.appendChild(item);
    });
  };

  const addToHistory = (entry) => {
    const history = getHistory().filter(
      (item) => !(item.name === entry.name && item.country === entry.country)
    );
    history.unshift(entry);
    writeStorage(HISTORY_STORAGE_KEY, history.slice(0, MAX_HISTORY_ITEMS));
    renderHistory();
  };

  const clearHistory = () => {
    writeStorage(HISTORY_STORAGE_KEY, []);
    renderHistory();
    showToast("Search history cleared.", "success");
  };

  /* ==================================================
     RENDER FUNCTIONS
     ================================================== */

  const updateCurrentWeather = (data, locationName, countryName) => {
    const current = data.current;
    const hourlyTimes = data.hourly.time;
    const daily = data.daily;
    const info = getWeatherInfo(current.weather_code);
    const isDay = current.is_day === 1;

    if (elements.cityName) elements.cityName.textContent = locationName || "--";
    if (elements.countryName) elements.countryName.textContent = countryName || "";
    if (elements.currentDate) elements.currentDate.textContent = formatDateLabel(current.time);
    if (elements.currentTime) elements.currentTime.textContent = formatTime(current.time);
    if (elements.currentCondition) elements.currentCondition.textContent = info.description;

    if (elements.currentTemperature) {
      elements.currentTemperature.textContent = round(current.temperature_2m) ?? "--";
    }
    if (elements.feelsLike) {
      elements.feelsLike.textContent = round(current.apparent_temperature) ?? "--";
    }
    if (elements.weatherSummaryText) {
      elements.weatherSummaryText.textContent = `${info.description} with winds near ${round(
        current.wind_speed_10m
      )} km/h. Feels like ${round(current.apparent_temperature)}°.`;
    }
    if (elements.chartLocation) {
      elements.chartLocation.textContent = `${locationName}${countryName ? `, ${countryName}` : ""}`;
    }
    changeWeatherIcon(current.weather_code, isDay);
    changeBackground(current.weather_code, isDay);

    /* --- Stats grid --- */
    const matchedIndex = findClosestHourlyIndex(hourlyTimes, current.time);
    const hourlyAt = (array) =>
      matchedIndex !== -1 && array && array[matchedIndex] != null ? array[matchedIndex] : null;

    if (elements.humidityValue) {
      elements.humidityValue.textContent = `${round(current.relative_humidity_2m) ?? "--"}%`;
    }
    if (elements.windValue) {
      elements.windValue.textContent = `${round(current.wind_speed_10m) ?? "--"} km/h`;
    }
    if (elements.pressureValue) {
      elements.pressureValue.textContent = `${round(current.pressure_msl) ?? "--"} hPa`;
    }

    const cloudCover = current.cloud_cover != null ? current.cloud_cover : hourlyAt(data.hourly.cloud_cover);
    if (elements.cloudValue) {
      elements.cloudValue.textContent = cloudCover != null ? `${round(cloudCover)}%` : "--";
    }

    const visibility = hourlyAt(data.hourly.visibility);
    if (elements.visibilityValue) {
      elements.visibilityValue.textContent = visibility != null ? `${(visibility / 1000).toFixed(1)} km` : "--";
    }

    const uvIndex = hourlyAt(data.hourly.uv_index);
    if (elements.uvValue) {
      elements.uvValue.textContent = uvIndex != null ? round(uvIndex) : "--";
    }

    const dewPoint = hourlyAt(data.hourly.dew_point_2m);
    if (elements.dewPointValue) {
      elements.dewPointValue.textContent = dewPoint != null ? `${round(dewPoint)}°` : "--";
    }

    const rainChance = hourlyAt(data.hourly.precipitation_probability);
    if (elements.rainValue) {
      elements.rainValue.textContent = rainChance != null ? `${round(rainChance)}%` : "--";
    }

    if (elements.sunriseValue) elements.sunriseValue.textContent = formatTime(daily.sunrise[0]);
    if (elements.sunsetValue) elements.sunsetValue.textContent = formatTime(daily.sunset[0]);

    if (elements.dashboard) elements.dashboard.hidden = false;

    currentWeatherState = {
      name: locationName,
      country: countryName,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  };

  const updateHourlyForecast = (data) => {
    if (!elements.hourlyForecast) return;

    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const codes = data.hourly.weather_code;
    const rainChances = data.hourly.precipitation_probability;
    const currentTime = data.current.time;

    let startIndex = times.indexOf(currentTime);
    if (startIndex === -1) startIndex = 0;
    const endIndex = Math.min(startIndex + 24, times.length);

    elements.hourlyForecast.innerHTML = "";

    for (let i = startIndex; i < endIndex; i++) {
      const info = getWeatherInfo(codes[i]);
      const hour = new Date(times[i]).getHours();
      const isDayHour = hour >= 6 && hour < 18;
      const rainChance = rainChances && rainChances[i] != null ? round(rainChances[i]) : null;

      const card = document.createElement("div");
      card.className = `hourly-card${i === startIndex ? " is-now" : ""}`;
      card.innerHTML = `
        <p class="hourly-time">${i === startIndex ? "Now" : formatHourLabel(times[i])}</p>
        <span class="hourly-icon" role="img" aria-label="${info.description}">${buildWeatherSvg(
        info.category,
        isDayHour
      )}</span>
        <p class="hourly-temperature">${round(temps[i])}°</p>
        ${
          rainChance != null && rainChance > 0
            ? `<span class="hourly-rain">${DROPLET_ICON_SVG}${rainChance}%</span>`
            : ""
        }
      `;
      elements.hourlyForecast.appendChild(card);
    }
  };

  const updateDailyForecast = (data) => {
    if (!elements.dailyForecast) return;

    const times = data.daily.time;
    const codes = data.daily.weather_code;
    const maxTemps = data.daily.temperature_2m_max;
    const minTemps = data.daily.temperature_2m_min;
    const rainChances = data.daily.precipitation_probability_max;

    elements.dailyForecast.innerHTML = "";

    for (let i = 0; i < times.length; i++) {
      const info = getWeatherInfo(codes[i]);
      const rainChance = rainChances && rainChances[i] != null ? round(rainChances[i]) : null;

      const card = document.createElement("article");
      card.className = `daily-card${i === 0 ? " is-today" : ""}`;
      card.innerHTML = `
        <p class="daily-day">${i === 0 ? "Today" : formatDayLabel(times[i])}</p>
        <p class="daily-date">${formatShortDate(times[i])}</p>
        <div class="daily-icon" role="img" aria-label="${info.description}">${buildWeatherSvg(
        info.category,
        true
      )}</div>
        <p class="daily-condition">${info.description}</p>
        <div class="daily-temperatures">
          <span class="daily-high">${round(maxTemps[i])}°</span>
          <span class="daily-low">${round(minTemps[i])}°</span>
        </div>
        ${
          rainChance != null && rainChance > 0
            ? `<div class="daily-rain">${DROPLET_ICON_SVG}${rainChance}%</div>`
            : ""
        }
      `;
      elements.dailyForecast.appendChild(card);
    }
  };

  const updateChart = (data) => {
    if (!elements.temperatureChart || typeof Chart === "undefined") return;

    const times = data.daily.time;
    const highs = data.daily.temperature_2m_max;
    const lows = data.daily.temperature_2m_min;
    const labels = times.map((time, index) => (index === 0 ? "Today" : formatDayLabel(time)));

    if (elements.chartEmpty) {
      elements.chartEmpty.hidden = times.length > 0;
    }

    if (temperatureChartInstance) {
      temperatureChartInstance.destroy();
      temperatureChartInstance = null;
    }

    const ctx = elements.temperatureChart.getContext("2d");

    temperatureChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "High",
            data: highs,
            fill: false,
            tension: 0.4,
            borderColor: "#4285f4",
            backgroundColor: "#4285f4",
            pointBackgroundColor: "#4285f4",
            pointRadius: 3,
            borderWidth: 2,
          },
          {
            label: "Low",
            data: lows,
            fill: false,
            tension: 0.4,
            borderColor: "#06b6d4",
            backgroundColor: "#06b6d4",
            pointBackgroundColor: "#06b6d4",
            pointRadius: 3,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { grid: { display: false } },
          y: { ticks: { callback: (value) => `${value}°` } },
        },
      },
    });
  };

  /* ==================================================
     API / DATA FUNCTIONS
     ================================================== */

  const buildForecastUrl = (latitude, longitude) => {
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: CURRENT_PARAMS,
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      timezone: "auto",
      forecast_days: "7",
    });
    return `${FORECAST_API_URL}?${params.toString()}`;
  };

  const fetchWeather = async (latitude, longitude, locationName, countryName) => {
    if (!navigator.onLine) {
      showError("You appear to be offline. Please check your internet connection.", "You're offline");
      return;
    }

    showWeatherLoading(`Fetching weather for ${locationName}…`);

    try {
      const response = await fetch(buildForecastUrl(latitude, longitude));

      if (!response.ok) {
        throw new Error(`Weather service error (status ${response.status}).`);
      }

      const data = await response.json();

      if (!data.current || !data.hourly || !data.daily) {
        throw new Error("Incomplete weather data received.");
      }

      clearError();
      updateCurrentWeather(data, locationName, countryName);
      updateHourlyForecast(data);
      updateDailyForecast(data);
      updateChart(data);
    } catch (error) {
      if (error instanceof TypeError) {
        showError("Network error. Please check your connection and try again.", "Connection problem");
      } else {
        showError(error.message || "Unable to fetch weather data. Please try again.");
      }
    } finally {
      hideWeatherLoading();
    }
  };

  const fetchCoordinates = async (cityName) => {
    if (!navigator.onLine) {
      showError("You appear to be offline. Please check your internet connection.", "You're offline");
      return;
    }

    try {
      const params = new URLSearchParams({ name: cityName, count: "1", language: "en", format: "json" });
      const response = await fetch(`${GEOCODING_API_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Location service error (status ${response.status}).`);
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        showError(`No results found for "${cityName}". Please check the spelling and try again.`, "City not found");
        return;
      }

      const result = data.results[0];
      clearError();
      await fetchWeather(result.latitude, result.longitude, result.name, result.country);
      addToHistory({
        name: result.name,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } catch (error) {
      if (error instanceof TypeError) {
        showError("Network error. Please check your connection and try again.", "Connection problem");
      } else {
        showError(error.message || "Unable to find that city. Please try again.");
      }
    }
  };

  /* ==================================================
     ACTION HANDLERS
     ================================================== */

  const searchCity = () => {
    if (!elements.searchInput) return;
    const cityName = elements.searchInput.value.trim();

    if (cityName === "") {
      showError("Please enter a city name to search.", "Empty search");
      return;
    }

    clearError();
    fetchCoordinates(cityName);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser.", "Not supported");
      return;
    }

    clearError();
    showWeatherLoading("Finding your location…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather(latitude, longitude, "Current Location", "");
      },
      (error) => {
        hideWeatherLoading();
        switch (error.code) {
          case error.PERMISSION_DENIED:
            showError("Location permission denied. Please enable location access and try again.", "Permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            showError("Location information is unavailable. Please try again later.", "Location unavailable");
            break;
          case error.TIMEOUT:
            showError("The request to get your location timed out. Please try again.", "Request timed out");
            break;
          default:
            showError("An unknown error occurred while retrieving your location.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const refreshWeather = () => {
    if (!currentWeatherState) return;
    if (elements.refreshButton) elements.refreshButton.classList.add("is-refreshing");

    fetchWeather(
      currentWeatherState.latitude,
      currentWeatherState.longitude,
      currentWeatherState.name,
      currentWeatherState.country
    ).finally(() => {
      if (elements.refreshButton) elements.refreshButton.classList.remove("is-refreshing");
    });
  };

  /* ==================================================
     VOICE SEARCH
     ================================================== */

  const initializeVoiceSearch = () => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi || !elements.voiceSearchButton) return;

    speechRecognizer = new SpeechRecognitionApi();
    speechRecognizer.lang = "en-US";
    speechRecognizer.interimResults = false;
    speechRecognizer.maxAlternatives = 1;

    speechRecognizer.addEventListener("result", (event) => {
      const transcript = event.results[0][0].transcript;
      if (elements.searchInput) elements.searchInput.value = transcript;
      searchCity();
    });

    speechRecognizer.addEventListener("end", () => {
      isVoiceListening = false;
      elements.voiceSearchButton.classList.remove("is-listening");
    });

    speechRecognizer.addEventListener("error", () => {
      isVoiceListening = false;
      elements.voiceSearchButton.classList.remove("is-listening");
      showToast("Could not hear you clearly. Please try again.", "error");
    });
  };

  const toggleVoiceSearch = () => {
    if (!speechRecognizer) {
      showToast("Voice search is not supported in this browser.", "error");
      return;
    }

    if (isVoiceListening) {
      speechRecognizer.stop();
      return;
    }

    try {
      isVoiceListening = true;
      elements.voiceSearchButton.classList.add("is-listening");
      speechRecognizer.start();
    } catch (error) {
      isVoiceListening = false;
      elements.voiceSearchButton.classList.remove("is-listening");
    }
  };

  /* ==================================================
     OFFLINE / ONLINE DETECTION
     ================================================== */

  const handleOnlineStatusChange = () => {
    if (navigator.onLine) {
      showToast("You're back online.", "success");
    } else {
      showToast("You are currently offline.", "error");
    }
  };

  /* ==================================================
     EVENT LISTENERS
     ================================================== */

  const attachEventListeners = () => {
    if (elements.searchForm) {
      elements.searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        searchCity();
      });
    }

    if (elements.locationButton) {
      elements.locationButton.addEventListener("click", getCurrentLocation);
    }

    if (elements.themeToggle) {
      elements.themeToggle.addEventListener("click", toggleTheme);
    }

    if (elements.voiceSearchButton) {
      elements.voiceSearchButton.addEventListener("click", toggleVoiceSearch);
    }

    if (elements.errorDismissButton) {
      elements.errorDismissButton.addEventListener("click", clearError);
    }

    if (elements.clearHistoryButton) {
      elements.clearHistoryButton.addEventListener("click", clearHistory);
    }

    if (elements.refreshButton) {
      elements.refreshButton.addEventListener("click", refreshWeather);
    }

    if (elements.hourlyPrevButton && elements.hourlyForecast) {
      elements.hourlyPrevButton.addEventListener("click", () => {
        elements.hourlyForecast.scrollBy({ left: -240, behavior: "smooth" });
      });
    }

    if (elements.hourlyNextButton && elements.hourlyForecast) {
      elements.hourlyNextButton.addEventListener("click", () => {
        elements.hourlyForecast.scrollBy({ left: 240, behavior: "smooth" });
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "l" && document.activeElement !== elements.searchInput) {
        event.preventDefault();
        getCurrentLocation();
      }
    });

    window.addEventListener("online", handleOnlineStatusChange);
    window.addEventListener("offline", handleOnlineStatusChange);
  };

  /* ==================================================
     INITIALIZATION
     ================================================== */

  const init = async () => {
    clearError();
    initializeTheme();
    initializeVoiceSearch();
    attachEventListeners();
    renderHistory();

    await new Promise((resolve) => {
      if (!navigator.geolocation) {
        fetchCoordinates(DEFAULT_CITY).finally(resolve);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude, "Current Location", "").finally(resolve);
        },
        () => {
          fetchCoordinates(DEFAULT_CITY).finally(resolve);
        },
        { timeout: 6000, maximumAge: 300000 }
      );
    });

    hideInitialLoadingScreen();
  };

  document.addEventListener("DOMContentLoaded", init);
})();
