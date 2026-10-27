const ICON_URLS = {
  twitch: "https://github.com/MaruFPS/MarusWidgets/blob/main/widget%20assets/twitch.png?raw=true",
  kick: "https://github.com/MaruFPS/MarusWidgets/blob/main/widget%20assets/kick.png?raw=true",
  youtube: "https://github.com/MaruFPS/MarusWidgets/blob/main/widget%20assets/ytv4.png?raw=true"
};

const PLATFORM_LABELS = {
  twitch: "Twitch",
  kick: "Kick",
  youtube: "YouTube"
};

const PLATFORM_ORDER = ["twitch", "kick", "youtube"];

const FONT_MAP = {
  "Archivo Black": { family: "Archivo Black", weight: 400 },
  "Anton": { family: "Anton", weight: 400 },
  "Audiowide": { family: "Audiowide", weight: 400 },
  "Barlow Condensed": { family: "Barlow Condensed", weight: 900 },
  "Bebas Neue": { family: "Bebas Neue", weight: 400 },
  "Bungee": { family: "Bungee", weight: 400 },
  "Graduate": { family: "Graduate", weight: 400 },
  "Inter": { family: "Inter", weight: 900 },
  "Montserrat": { family: "Montserrat", weight: 900 },
  "Nunito Sans": { family: "Nunito Sans", weight: 900 },
  "Orbitron": { family: "Orbitron", weight: 900 },
  "Outfit": { family: "Outfit", weight: 900 },
  "Poppins": { family: "Poppins", weight: 900 },
  "Rubik": { family: "Rubik", weight: 900 }
};

const settings = {
  worker_url: "{worker_url}",
  twitch: "{twitch}",
  kick: "{kick}",
  youtube: "{youtube}",
  style: "{style}",
  scale: "{scale}",
  font: "{font}",
  font_size: "{font_size}",
  icon_size: "{icon_size}",
  icon_gap: "{icon_gap}",
  update_seconds: "{update_seconds}",
  animation_ms: "{animation_ms}",
  box_opacity: "{box_opacity}",
  box_blur: "{box_blur}",
  box_radius: "{box_radius}",
  shadow: "{shadow}",
  shadow_color: "{shadow_color}",
  shadow_blur: "{shadow_blur}",
  shadow_x: "{shadow_x}",
  shadow_y: "{shadow_y}"
};

let displayedTotal = 0;
let latestTotal = 0;
let pollTimer = null;
let pollGeneration = 0;
let animationFrame = null;
let requestController = null;
let hasLoadedOnce = false;
let fitFrame = null;
let lastRenderedLength = 0;
let stageResizeObserver = null;

function fitWidgetToCanvas() {
  const stage = document.getElementById("scaleStage");
  if (!stage) return;

  const viewportWidth = Math.max(
    1,
    document.documentElement.clientWidth || window.innerWidth || 1
  );

  const viewportHeight = Math.max(
    1,
    document.documentElement.clientHeight || window.innerHeight || 1
  );

  const naturalWidth = Math.max(1, stage.offsetWidth);
  const naturalHeight = Math.max(1, stage.offsetHeight);

  const fitScale = Math.min(
    viewportWidth / naturalWidth,
    viewportHeight / naturalHeight
  );

  const safeScale = clamp(fitScale, .05, 20, 1);

  stage.style.transform =
    "translate(-50%,-50%) scale(" + safeScale + ")";
}

function scheduleCanvasFit() {
  if (fitFrame) {
    cancelAnimationFrame(fitFrame);
  }

  fitFrame = requestAnimationFrame(() => {
    fitFrame = null;
    fitWidgetToCanvas();
  });
}

function startCanvasFit() {
  const widget = document.getElementById("viewerWidget");

  if (typeof ResizeObserver === "function") {
    stageResizeObserver = new ResizeObserver(scheduleCanvasFit);
    stageResizeObserver.observe(document.documentElement);

    if (widget) {
      stageResizeObserver.observe(widget);
    }
  }

  window.addEventListener("resize", scheduleCanvasFit);
  scheduleCanvasFit();
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanWorkerUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function cleanUsername(value) {
  return String(value || "").trim();
}

function getUpdateMilliseconds() {
  return clamp(settings.update_seconds, 10, 300, 35) * 1000;
}

function getAnimationMilliseconds() {
  return clamp(settings.animation_ms, 100, 5000, 900);
}

function applySelectedFont() {
  const totalElement = document.getElementById("viewerTotal");
  if (!totalElement) return;

  const selected = FONT_MAP[settings.font] || FONT_MAP["Archivo Black"];
  const family = '"' + selected.family + '",Arial,Helvetica,sans-serif';

  totalElement.style.fontFamily = family;
  totalElement.style.fontWeight = String(selected.weight);

  if (document.fonts && typeof document.fonts.load === "function") {
    const fontSize = clamp(settings.font_size, 10, 150, 42);
    const request = selected.weight + " " + fontSize + "px \"" + selected.family + "\"";

    document.fonts.load(request)
      .then(scheduleCanvasFit)
      .catch(() => { });
  } else {
    scheduleCanvasFit();
  }
}

function applyAppearance() {
  const widget = document.getElementById("viewerWidget");
  if (!widget) return;

  const scale = clamp(settings.scale, .25, 4, 1);
  const opacity = clamp(settings.box_opacity, 0, 1, .58);
  const blur = clamp(settings.box_blur, 0, 40, 8);
  const radius = clamp(settings.box_radius, 0, 100, 12);
  const fontSize = clamp(settings.font_size, 10, 150, 42);
  const iconSize = clamp(settings.icon_size, 10, 100, 36);
  const iconGap = clamp(settings.icon_gap, -30, 40, 0);
  const shadowEnabled = settings.shadow !== "No";
  const shadowColor = shadowEnabled
    ? String(settings.shadow_color || "rgba(0,0,0,0.65)")
    : "rgba(0,0,0,0)";
  const shadowBlur = clamp(settings.shadow_blur, 0, 40, 4);
  const shadowX = clamp(settings.shadow_x, -40, 40, 0);
  const shadowY = clamp(settings.shadow_y, -40, 40, 2);

  widget.style.setProperty("--widget-scale", String(scale));
  widget.style.setProperty("--box-opacity", String(opacity));
  widget.style.setProperty("--box-blur", blur + "px");
  widget.style.setProperty("--box-radius", radius + "px");
  widget.style.setProperty("--viewer-font-size", fontSize + "px");
  widget.style.setProperty("--icon-size", iconSize + "px");
  widget.style.setProperty("--icon-gap", iconGap + "px");
  widget.style.setProperty("--shadow-color", shadowColor);
  widget.style.setProperty("--shadow-blur", (shadowBlur * scale) + "px");
  widget.style.setProperty("--shadow-x", (shadowX * scale) + "px");
  widget.style.setProperty("--shadow-y", (shadowY * scale) + "px");

  const boxed = settings.style !== "Minimal";
  widget.classList.toggle("boxed", boxed);
  widget.classList.toggle("minimal", !boxed);

  applySelectedFont();
  scheduleCanvasFit();
}

function buildRequestUrl() {
  const workerUrl = cleanWorkerUrl(settings.worker_url);
  if (!workerUrl) return null;

  const url = new URL(workerUrl);
  const twitch = cleanUsername(settings.twitch);
  const kick = cleanUsername(settings.kick);
  const youtube = cleanUsername(settings.youtube);

  if (twitch) url.searchParams.set("twitch", twitch);
  if (kick) url.searchParams.set("kick", kick);
  if (youtube) url.searchParams.set("youtube", youtube);

  if (!twitch && !kick && !youtube) return null;

  // Force every Pogly/browser request to be unique.
  url.searchParams.set(
    "_maru",
    Date.now().toString() + "-" + Math.random().toString(36).slice(2)
  );

  return url.toString();
}

function renderPlatformIcons(livePlatforms) {
  const icons = document.getElementById("platformIcons");
  const widget = document.getElementById("viewerWidget");
  if (!icons || !widget) return;

  const liveSet = new Set(
    Array.isArray(livePlatforms)
      ? livePlatforms
      : []
  );

  icons.innerHTML = "";

  PLATFORM_ORDER.forEach(platform => {
    if (!liveSet.has(platform)) return;

    const slot = document.createElement("span");
    slot.className = "platform-icon-slot " + platform;

    const image = document.createElement("img");
    image.className = "platform-icon";
    image.src = ICON_URLS[platform];
    image.alt = PLATFORM_LABELS[platform];
    image.decoding = "async";
    image.draggable = false;

    slot.appendChild(image);
    icons.appendChild(slot);
  });

  widget.classList.toggle(
    "no-live",
    icons.children.length === 0
  );

  scheduleCanvasFit();
}

function formatViewerCount(value) {
  return Math.max(
    0,
    Math.round(Number(value) || 0)
  ).toLocaleString("en-US");
}

function setDisplayedTotal(value) {
  displayedTotal = Math.max(
    0,
    Math.round(Number(value) || 0)
  );

  const totalElement = document.getElementById("viewerTotal");

  if (totalElement) {
    const formatted = formatViewerCount(displayedTotal);
    totalElement.textContent = formatted;

    if (formatted.length !== lastRenderedLength) {
      lastRenderedLength = formatted.length;
      scheduleCanvasFit();
    }
  }
}

function animateTotal(nextTotal) {
  latestTotal = Math.max(
    0,
    Math.round(Number(nextTotal) || 0)
  );

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  const reducedMotion =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  const duration = reducedMotion
    ? 0
    : getAnimationMilliseconds();

  const startValue = displayedTotal;
  const difference = latestTotal - startValue;

  if (duration <= 0 || difference === 0) {
    setDisplayedTotal(latestTotal);
    return;
  }

  const startTime = performance.now();

  function step(now) {
    const progress = Math.min(
      1,
      (now - startTime) / duration
    );

    const eased = 1 - Math.pow(1 - progress, 3);

    setDisplayedTotal(
      startValue + difference * eased
    );

    if (progress < 1) {
      animationFrame = requestAnimationFrame(step);
    } else {
      animationFrame = null;
      setDisplayedTotal(latestTotal);
      scheduleCanvasFit();
    }
  }

  animationFrame = requestAnimationFrame(step);
}

async function refreshViewerCount() {
  const widget = document.getElementById("viewerWidget");
  const requestUrl = buildRequestUrl();

  if (!requestUrl) {
    renderPlatformIcons([]);
    animateTotal(0);
    return;
  }

  if (requestController) {
    requestController.abort();
  }

  requestController = new AbortController();

  if (widget) {
    widget.classList.add("loading");
  }

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      signal: requestController.signal
    });

    if (!response.ok) {
      throw new Error(
        "Viewer API returned " + response.status
      );
    }

    const data = await response.json();

    if (!data || data.success !== true) {
      throw new Error(
        data?.error ||
        "Viewer API returned an invalid response"
      );
    }

    console.log("[Maru Viewer Poll]", {
      localTime: new Date().toISOString(),
      total: data.total,
      twitch: data.twitch?.viewers ?? null,
      kick: data.kick?.viewers ?? null,
      youtube: data.youtube?.viewers ?? null,
      workerRequestStartedAt: data.debug?.requestStartedAt ?? null,
      workerRespondedAt: data.debug?.respondedAt ?? null,
      workerCache: data.cache ?? null
    });

    renderPlatformIcons(data.livePlatforms);

    if (!hasLoadedOnce) {
      setDisplayedTotal(0);
      hasLoadedOnce = true;
    }

    animateTotal(data.total);
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn(
        "Viewer count refresh failed:",
        error
      );
    }
  } finally {
    if (widget) {
      widget.classList.remove("loading");
    }
  }
}

function schedulePollingCycle(generation, delay) {
  if (generation !== pollGeneration) return;

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  pollTimer = setTimeout(async () => {
    pollTimer = null;

    if (generation !== pollGeneration) return;

    await refreshViewerCount();

    if (generation !== pollGeneration) return;

    schedulePollingCycle(
      generation,
      getUpdateMilliseconds()
    );
  }, Math.max(0, Number(delay) || 0));
}

function restartPolling(immediate = true) {
  pollGeneration += 1;
  const generation = pollGeneration;

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  if (requestController) {
    requestController.abort();
    requestController = null;
  }

  if (immediate) {
    schedulePollingCycle(generation, 0);
  } else {
    schedulePollingCycle(
      generation,
      getUpdateMilliseconds()
    );
  }
}

function onLiveVariableUpdate(name, value) {
  if (!Object.prototype.hasOwnProperty.call(settings, name)) return;

  settings[name] = value;
  applyAppearance();

  if (name === "update_seconds") {
    restartPolling(false);
    return;
  }

  if ([
    "worker_url",
    "twitch",
    "kick",
    "youtube"
  ].includes(name)) {
    hasLoadedOnce = false;
    restartPolling(true);
  }
}

applyAppearance();
startCanvasFit();
restartPolling(true);