const TWEMOJI_SCRIPT_URL =
  "https://cdn.jsdelivr.net/npm/@twemoji/api@17.0.3/dist/twemoji.min.js";

const twemojiReady = new Promise(resolve => {
  if (window.twemoji?.parse) {
    console.log("[TWEMOJI] Already loaded.");
    resolve(true);
    return;
  }

  const script = document.createElement("script");
  script.src = TWEMOJI_SCRIPT_URL;
  script.async = true;

  script.onload = () => {
    const loaded = typeof window.twemoji?.parse === "function";

    console.log(
      loaded
        ? "[TWEMOJI] Loaded successfully."
        : "[TWEMOJI] Script loaded, but API is unavailable."
    );

    resolve(loaded);
  };

  script.onerror = error => {
    console.error("[TWEMOJI] Failed to load.", error);
    resolve(false);
  };

  document.head.appendChild(script);
});

const chatContainer = document.getElementById("chat");

const DEBUG = true;

function debugLog(...args) {
  if (DEBUG) console.log("[KICK CHAT DEBUG]", ...args);
}

function debugWarn(...args) {
  if (DEBUG) console.warn("[KICK CHAT DEBUG]", ...args);
}

function debugError(...args) {
  if (DEBUG) console.error("[KICK CHAT DEBUG]", ...args);
}

function debugGroup(title, data = {}) {
  if (!DEBUG) return;

  console.groupCollapsed(`[KICK CHAT DEBUG] ${title}`);
  Object.entries(data).forEach(([key, value]) => {
    console.log(key, value);
  });
  console.groupEnd();
}

const ignoredBotNames = [
  "kickbot",
  "@streamelements",
  "nightbot",
  "botrix",
  "fossabot",
  "moobot"
];

const maxMessages = 15;

const SEVENTV_EMOTE_SET_ID = "01KHNT6VCYF7DE58E75K7FFCH5";
const SEVENTV_GLOBAL_EMOTE_SET_ID = "01GFYQA4Z000080AGE6JXCJVEJ";

/*
  Emergency fallback only.
  Auto lookup will try Kick user ID first.
*/
const SEVENTV_USER_IDS = {
  marufps: "01JVWPCYEW0EBRXQ00ATRC2D3M"
};

const EASTER_PAINT_SOURCE_USER = "marufps";

const EASTER_PAINT_USERS = [
  "marufps",
  "alysee",
  "zayyxhailyxalyse"
];

let easterPaintData = null;

/*
  Global Kick badges are resolved by Maru's existing Worker.
  This avoids deleted ImgBB images and KickBot's generic badge art.
  Channel-specific subscriber badges continue to use the live Kick resolver below.
*/
const KICK_BADGE_WORKER_URL =
  "https://marus-viewer-count.evolvexdesigns.workers.dev/kick/chat-badges";
const KICK_BADGE_REQUEST_CACHE_MS = 6 * 60 * 60 * 1000;
const kickBadgeRequestCache = new Map();
const kickBadgeRequestLoading = new Map();

/*
  Subscriber badges are channel-specific. Never fall back to another
  channel's artwork: resolve them from KickBot's connected streamer data,
  the live event payload, or the current Kick channel API.
*/
let dynamicSubscriberBadgeImages = {};
let subscriberBadgeChannelSlug = "";
let subscriberBadgeLoadPromise = null;

let sevenTVEmotes = {};
const sevenTVCosmeticCache = {};
const sevenTVCosmeticLoading = {};
const sevenTVPaintCache = {};
const sevenTVUserDetailCache = {};
const kickProfilePictureCache = {};

const SEVENTV_CACHE_TIME = 30 * 1000; // 1 minute

const MESSAGE_LIFETIME = 67 * 1000; // 75 seconds

const FALLBACK_PROFILE_PICTURES = [
  { color: "#3b82f6", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20blue.png" },
  { color: "#06b6d4", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20cyan.png" },
  { color: "#22c55e", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20green.png" },
  { color: "#f97316", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20orange.png" },
  { color: "#ef4444", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20red.png" },
  { color: "#ec4899", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20pink.png" },
  { color: "#8b5cf6", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20violet.png" },
  { color: "#eab308", url: "https://raw.githubusercontent.com/MaruFPS/MarusWidgets/main/widget%20assets/user%20yellow.png" }
];

function extractKickUserIdFromPfp(url) {
  const match = String(url || "").match(/\/images\/user\/(\d+)\//);
  return match ? match[1] : "";
}

function getKickUserIdFromSender(sender = {}, profilePicture = "") {
  const possibleKickIds = {
    senderId: sender?.id,
    senderUserId: sender?.user_id,
    senderKickId: sender?.kick_id,
    senderChannelId: sender?.channel_id,
    senderNestedUserId: sender?.user?.id,
    identityId: sender?.identity?.id,
    pfpExtractedId: extractKickUserIdFromPfp(profilePicture)
  };

  debugGroup("Kick Sender ID Sources", {
    sender,
    possibleKickIds
  });

  return (
    possibleKickIds.senderId ||
    possibleKickIds.senderUserId ||
    possibleKickIds.senderKickId ||
    possibleKickIds.senderChannelId ||
    possibleKickIds.senderNestedUserId ||
    possibleKickIds.identityId ||
    possibleKickIds.pfpExtractedId ||
    ""
  );
}

async function loadSevenTVEmoteSet(setId) {
  try {
    const response = await fetch(`https://7tv.io/v3/emote-sets/${setId}`);

    if (!response.ok) {
      debugWarn("Failed to load 7TV set:", setId, response.status);
      return;
    }

    const data = await response.json();

    data.emotes.forEach(emote => {
      sevenTVEmotes[emote.name] = emote.id;
    });

    debugGroup("7TV Emote Set Loaded", {
      setId,
      count: data.emotes.length,
      emotes: data.emotes
    });
  } catch (error) {
    debugError("7TV load error:", error);
  }
}

async function loadAllSevenTVEmotes() {
  sevenTVEmotes = {};

  await loadSevenTVEmoteSet(SEVENTV_GLOBAL_EMOTE_SET_ID);
  await loadSevenTVEmoteSet(SEVENTV_EMOTE_SET_ID);

  debugGroup("All 7TV Emotes Loaded", {
    total: Object.keys(sevenTVEmotes).length,
    sevenTVEmotes
  });
}

async function loadSevenTVPaint(paintId) {
  if (!paintId) return null;

  if (sevenTVPaintCache[paintId]) {
    debugGroup("7TV Paint Cache Hit", {
      paintId,
      paint: sevenTVPaintCache[paintId]
    });

    return sevenTVPaintCache[paintId];
  }

  try {
    const response = await fetch("https://7tv.io/v3/gql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query {
            cosmetics {
              paints {
                id
                name
                function
                color
                image_url
                angle
                shape
                repeat
                stops {
                  at
                  color
                }
                shadows {
                  x_offset
                  y_offset
                  radius
                  color
                }
              }

              badges {
                id
                name
                tooltip
                host {
                  url
                }
              }
            }
          }
        `
      })
    });

    if (!response.ok) {
      debugWarn("7TV paint GQL failed:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("FULL 7TV COSMETICS GQL RESPONSE:", data);
    console.log("ALL 7TV PAINTS LIST:", data?.data?.cosmetics?.paints);
    console.log("ALL 7TV BADGES LIST:", data?.data?.cosmetics?.badges);
    const paints = data?.data?.cosmetics?.paints || [];
    const paint = paints.find(p => p.id === paintId) || null;

    sevenTVPaintCache[paintId] = paint;

    debugGroup("7TV Paint Loaded", {
      paintId,
      paint,
      allPaintsCount: paints.length
    });

    return paint;
  } catch (error) {
    debugError("7TV paint load failed:", error);
    return null;
  }
}


async function loadSevenTVUserDetails(sevenTVUserId) {
  if (!sevenTVUserId) return null;

  const id = String(sevenTVUserId).trim();
  if (!id) return null;

  if (sevenTVUserDetailCache[id] !== undefined) {
    return sevenTVUserDetailCache[id];
  }

  const urlsToTry = [
    `https://7tv.io/v3/users/${id}`,
    `https://7tv.io/v3/users/7tv/${id}`
  ];

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url);

      debugGroup("7TV Detailed User URL Tried", {
        sevenTVUserId: id,
        url,
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) continue;

      const user = await response.json();
      sevenTVUserDetailCache[id] = user;

      debugGroup("7TV Detailed User Loaded", {
        sevenTVUserId: id,
        style: user?.style,
        user
      });

      return user;
    } catch (error) {
      debugWarn("7TV detailed user lookup failed:", url, error);
    }
  }

  sevenTVUserDetailCache[id] = null;
  return null;
}

function hexToRgb(hex) {
  if (!hex) return null;

  const cleanHex = String(hex).trim().replace("#", "");
  if (cleanHex.length !== 6) return null;

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

function getClosestFallbackProfilePicture(nameColor = "") {
  const userColor = hexToRgb(nameColor);

  if (!userColor) {
    return FALLBACK_PROFILE_PICTURES[0].url;
  }

  let closestIcon = FALLBACK_PROFILE_PICTURES[0];
  let smallestDistance = Infinity;

  FALLBACK_PROFILE_PICTURES.forEach(icon => {
    const iconColor = hexToRgb(icon.color);
    if (!iconColor) return;

    const distance =
      Math.pow(userColor.r - iconColor.r, 2) +
      Math.pow(userColor.g - iconColor.g, 2) +
      Math.pow(userColor.b - iconColor.b, 2);

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestIcon = icon;
    }
  });

  debugGroup("Fallback PFP Match", {
    nameColor,
    userColor,
    closestIcon
  });

  return closestIcon.url;
}

async function loadKickProfilePicture(slug, nameColor = "") {
  const fallbackPfp = getClosestFallbackProfilePicture(nameColor);

  if (!slug) {
    debugGroup("Kick PFP Fallback Used", {
      reason: "Missing slug",
      fallbackPfp
    });

    return fallbackPfp;
  }

  const key = String(slug).toLowerCase().trim();

  if (kickProfilePictureCache[key] !== undefined) {
    debugGroup("Kick PFP Cache Hit", {
      slug: key,
      pfp: kickProfilePictureCache[key]
    });

    return kickProfilePictureCache[key];
  }

  try {
    const response = await fetch(`https://kick.com/api/v2/channels/${key}`);

    if (!response.ok) {
      debugWarn("Kick profile fetch failed:", key, response.status);
      kickProfilePictureCache[key] = fallbackPfp;
      return kickProfilePictureCache[key];
    }

    const data = await response.json();

    const pfp =
      data?.user?.profile_pic ||
      data?.user?.profilepic ||
      data?.user?.profile_picture ||
      data?.user?.profile_picture_url ||
      data?.profile_pic ||
      data?.profilepic ||
      data?.avatar ||
      fallbackPfp;

    kickProfilePictureCache[key] = pfp;

    debugGroup("Kick Profile Picture Loaded", {
      slug: key,
      pfp,
      fallbackPfp,
      rawKickProfile: data
    });

    return pfp;
  } catch (error) {
    debugError("Kick profile picture fetch error:", error);
    kickProfilePictureCache[key] = fallbackPfp;
    return kickProfilePictureCache[key];
  }
}

async function loadSevenTVCosmeticsByConnection(username, kickUserId = "") {
  if (!username || !kickUserId) return null;

  const key = username.toLowerCase().trim();
  const connectionCacheKey = `${key}:kick:${kickUserId}`;
  const cached = sevenTVCosmeticCache[connectionCacheKey];

  if (cached && Date.now() - cached.cachedAt < SEVENTV_CACHE_TIME) {
    debugGroup("7TV Auto Cosmetic Cache Hit", {
      username,
      kickUserId,
      cosmetics: cached.cosmetics
    });
    return cached.cosmetics;
  }

  if (sevenTVCosmeticLoading[connectionCacheKey]) {
    debugLog("7TV auto cosmetic already loading:", connectionCacheKey);
    return null;
  }

  sevenTVCosmeticLoading[connectionCacheKey] = true;

  try {
    const response = await fetch("https://7tv.io/v3/gql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "GetUserByConnection",
        variables: { id: String(kickUserId), platform: "KICK" },
        query: `
          query GetUserByConnection($platform: ConnectionPlatform!, $id: String!) {
            user: userByConnection(platform: $platform, id: $id) {
              id
              username
              display_name
              avatar_url
              style {
                color
                paint_id
                badge_id
                __typename
              }
              connections {
                platform
                emote_set_id
                __typename
              }
              roles
              __typename
            }
          }
        `
      })
    });

    if (!response.ok) {
      debugWarn("7TV auto GQL lookup failed:", response.status);
      sevenTVCosmeticCache[connectionCacheKey] = null;
      return null;
    }

    const result = await response.json();
    const user = result?.data?.user;

    debugGroup("7TV Auto Lookup Response", {
      username,
      kickUserId,
      gqlResult: result,
      sevenTVUser: user
    });

    if (!user) {
      sevenTVCosmeticCache[connectionCacheKey] = null;
      return null;
    }

    const connectionStyle = user.style || {};
    const detailedUser = await loadSevenTVUserDetails(user.id);
    const detailedStyle = detailedUser?.style || {};
    const style = {
      ...connectionStyle,
      ...detailedStyle
    };

    const paintId =
      style.paint_id ||
      connectionStyle.paint_id ||
      null;

    /*
      Prefer the full paint object embedded in the 7TV user style.
      It contains modern gradients[] metadata such as per-layer size,
      position and canvas repeat. Fall back to the old cosmetics query
      only when the embedded paint is unavailable.
    */
    const paintData =
      style.paint ||
      connectionStyle.paint ||
      (paintId ? await loadSevenTVPaint(paintId) : null);

    const badgeId =
      style.badge_id ||
      connectionStyle.badge_id ||
      null;

    const cosmetics = {
      color: style.color || connectionStyle.color || null,
      paintId,
      badgeId,
      badgeUrl: badgeId
        ? `https://cdn.7tv.app/badge/${badgeId}/4x.webp`
        : null,
      paintData,
      raw: detailedUser || user,
      source: style.paint ? "kick-connection-modern-paint" : "kick-connection",
      kickUserId
    };

    const cacheEntry = {
      cosmetics,
      cachedAt: Date.now()
    };

    sevenTVCosmeticCache[connectionCacheKey] = cacheEntry;
    sevenTVCosmeticCache[key] = cacheEntry;

    if (key === EASTER_PAINT_SOURCE_USER && paintData) {
      easterPaintData = paintData;
    }

    debugGroup("7TV Auto Cosmetics Resolved", {
      username,
      kickUserId,
      cosmetics
    });

    return cosmetics;
  } catch (error) {
    debugError("7TV auto cosmetic lookup failed:", error);
    sevenTVCosmeticCache[connectionCacheKey] = null;
    return null;
  } finally {
    sevenTVCosmeticLoading[connectionCacheKey] = false;
  }
}

async function loadSevenTVCosmeticsByHardcodedId(username) {
  if (!username) return null;

  const key = username.toLowerCase().trim();
  const userId = SEVENTV_USER_IDS[key];
  const cached = sevenTVCosmeticCache[key];

  if (cached && Date.now() - cached.cachedAt < SEVENTV_CACHE_TIME) {
    debugGroup("7TV Hardcoded Cosmetic Cache Hit", {
      username,
      cosmetics: cached.cosmetics
    });
    return cached.cosmetics;
  }

  if (sevenTVCosmeticLoading[key]) {
    debugLog("7TV cosmetic already loading:", key);
    return null;
  }

  if (!userId) {
    debugGroup("7TV Hardcoded Cosmetic Lookup Skipped", {
      username: key,
      reason: "No hardcoded 7TV user ID"
    });
    sevenTVCosmeticCache[key] = null;
    return null;
  }

  sevenTVCosmeticLoading[key] = true;

  const urlsToTry = [
    `https://7tv.io/v3/users/${userId}`,
    `https://7tv.io/v3/users/7tv/${userId}`
  ];

  try {
    for (const url of urlsToTry) {
      const response = await fetch(url);

      debugGroup("7TV User URL Tried", {
        username: key,
        url,
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) continue;

      const user = await response.json();
      const style = user.style || {};
      const paintId = style.paint_id || null;

      const paintData =
        style.paint ||
        (paintId ? await loadSevenTVPaint(paintId) : null);

      const cosmetics = {
        color: style.color || null,
        paintId,
        badgeId: style.badge_id || null,
        badgeUrl: style.badge_id
          ? `https://cdn.7tv.app/badge/${style.badge_id}/4x.webp`
          : null,
        paintData,
        raw: user,
        source: style.paint ? "hardcoded-modern-paint" : "hardcoded"
      };

      const cacheEntry = {
        cosmetics,
        cachedAt: Date.now()
      };

      sevenTVCosmeticCache[key] = cacheEntry;

      if (key === EASTER_PAINT_SOURCE_USER && paintData) {
        easterPaintData = paintData;
      }

      debugGroup("7TV Hardcoded Cosmetics Resolved", {
        username: key,
        finalCosmetics: cosmetics
      });

      return cosmetics;
    }

    sevenTVCosmeticCache[key] = null;
    return null;
  } catch (error) {
    debugError("7TV hardcoded cosmetic lookup failed:", error);
    sevenTVCosmeticCache[key] = null;
    return null;
  } finally {
    sevenTVCosmeticLoading[key] = false;
  }
}

async function loadSevenTVCosmetics(username, kickUserId = "") {
  const autoCosmetics = kickUserId
    ? await loadSevenTVCosmeticsByConnection(username, kickUserId)
    : null;

  if (autoCosmetics?.cosmetics) return autoCosmetics.cosmetics;
  if (autoCosmetics) return autoCosmetics;

  return await loadSevenTVCosmeticsByHardcodedId(username);
}

loadAllSevenTVEmotes();

function isBot(username) {
  if (!username) return false;
  return ignoredBotNames.includes(username.toLowerCase());
}

function shouldUseEasterPaint(username) {
  const usePaint = EASTER_PAINT_USERS.includes(
    String(username || "").toLowerCase().trim()
  );

  debugGroup("Easter Paint Check", {
    username,
    usePaint,
    easterPaintData
  });

  return usePaint;
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseNativeEmoji(text) {
  const originalText = String(text || "");

  if (!window.twemoji || typeof window.twemoji.parse !== "function") {
    debugWarn("Emoji parser unavailable; using native Unicode.");
    return escapeHTML(originalText);
  }

  /*
   * Protect every complete emoji grapheme before Twemoji parses
   * the remaining text. This gives plain and skin-toned emoji the
   * same Fluent image path and prevents Toolkit from shrinking,
   * splitting or dropping text-presentation emoji such as hands.
   */
  const protectedEmoji = [];
  const segmenter = typeof Intl?.Segmenter === "function"
    ? new Intl.Segmenter("en", { granularity: "grapheme" })
    : null;

  function isEmojiGrapheme(grapheme) {
    return (
      /\p{Extended_Pictographic}/u.test(grapheme) ||
      /[\p{Regional_Indicator}]{2}/u.test(grapheme) ||
      /[0-9#*]\uFE0F?\u20E3/u.test(grapheme)
    );
  }

  function protectEmoji(grapheme) {
    /*
     * Fluent's Unicode mirror generally omits FE0F, while Twemoji
     * requires it for some text-default symbols inside ZWJ sequences
     * such as professions. Keep separate filenames for each source.
     */
    const fluentCodepoint = Array.from(grapheme)
      .map(character => character.codePointAt(0).toString(16))
      .filter(value => value !== "fe0f")
      .join("-");

    /*
     * Ask Twemoji's parser for the exact canonical asset filename.
     * This handles FE0F differently for plain symbols, ZWJ emoji,
     * and skin-tone sequences instead of applying one rule to all.
     */
    const twemojiIcons = [];
    const twemojiProbe = document.createElement("span");
    twemojiProbe.textContent = grapheme;

    window.twemoji.parse(twemojiProbe, {
      callback(icon) {
        if (icon) twemojiIcons.push(icon);

        return (
          "data:image/gif;base64," +
          "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
        );
      }
    });

    const twemojiCodepoint =
      twemojiIcons
        .sort((a, b) => {
          const aParts = a.split("-").length;
          const bParts = b.split("-").length;

          return bParts - aParts || b.length - a.length;
        })[0] ||
      Array.from(grapheme)
        .map(character => character.codePointAt(0).toString(16))
        .filter(value => value !== "fe0f")
        .join("-");

    const token = `__FLUENT_EMOJI_${protectedEmoji.length}__`;

    protectedEmoji.push({
      token,
      alt: grapheme,
      fluentCodepoint,
      twemojiCodepoint
    });

    return token;
  }

  let protectedText = "";

  if (segmenter) {
    for (const item of segmenter.segment(originalText)) {
      const grapheme = item.segment;

      protectedText += isEmojiGrapheme(grapheme)
        ? protectEmoji(grapheme)
        : grapheme;
    }
  } else {
    /*
     * Older-engine fallback covering pictographic emoji, optional
     * variation selectors and skin tones, ZWJ chains, flags and
     * keycap sequences.
     */
    protectedText = originalText.replace(
      /(?:\p{Extended_Pictographic}\uFE0F?(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u200D\p{Extended_Pictographic}\uFE0F?(?:[\u{1F3FB}-\u{1F3FF}])?)*|[\p{Regional_Indicator}]{2}|[0-9#*]\uFE0F?\u20E3)/gu,
      grapheme => protectEmoji(grapheme)
    );
  }

  const container = document.createElement("span");
  container.textContent = protectedText;

  try {
    /*
     * Parse any uncommon emoji sequences not caught by the grapheme
     * detector while preserving ordinary text.
     */
    window.twemoji.parse(container, {
      className: "emote native-emoji",

      callback(icon) {
        return (
          "https://cdn.jsdelivr.net/gh/shuding/" +
          "fluentui-emoji-unicode@main/assets/" +
          icon +
          "_3d.png"
        );
      }
    });

    container.querySelectorAll("img.native-emoji").forEach(image => {
      image.draggable = false;
      image.loading = "eager";
      image.decoding = "async";

      const codepoint = image.src
        .split("/")
        .pop()
        .replace("_3d.png", "");

      image.dataset.fallback =
        "https://cdn.jsdelivr.net/gh/jdecked/" +
        "twemoji@17.0.3/assets/svg/" +
        codepoint +
        ".svg";

      /*
       * Hold the Fluent URL until this image exists in the final
       * message element, where the fallback listener can be attached
       * before loading begins.
       */
      image.dataset.fluentSrc = image.src;
      image.removeAttribute("src");
    });

    let parsedHTML = container.innerHTML;

    protectedEmoji.forEach(({
      token,
      alt,
      fluentCodepoint,
      twemojiCodepoint
    }) => {
      const fluentSrc =
        "https://cdn.jsdelivr.net/gh/shuding/" +
        "fluentui-emoji-unicode@main/assets/" +
        fluentCodepoint +
        "_3d.png";

      const fallbackSrc =
        "https://cdn.jsdelivr.net/gh/jdecked/" +
        "twemoji@17.0.3/assets/svg/" +
        twemojiCodepoint +
        ".svg";

      const emojiImage = `<img
        draggable="false"
        loading="eager"
        decoding="async"
        class="emote native-emoji"
        alt="${escapeHTML(alt)}"
        data-fluent-src="${fluentSrc}"
        data-fallback="${fallbackSrc}"
      >`;

      parsedHTML = parsedHTML.replace(token, emojiImage);
    });

    return parsedHTML;
  } catch (error) {
    debugError("Fluent Emoji parsing failed:", error);
    return escapeHTML(originalText);
  }
}

function isNativeEmojiOnly(text) {
  const stripped = String(text || "")
    /*
     * Emoji bases, ZWJ characters, variation selectors,
     * skin tones, regional indicators and keycap marks.
     */
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D\u20E3]/gu,
      ""
    )
    .replace(/[\s\p{P}\p{S}\d#*]/gu, "");

  return stripped.length === 0;
}

function safeCSSValue(value) {
  return String(value || "")
    .replaceAll(";", "")
    .replaceAll("{", "")
    .replaceAll("}", "")
    .replaceAll("<", "")
    .replaceAll(">", "");
}

function getBadgeImageUrl(badge = {}) {
  const url =
    badge?.image_url ||
    badge?.imageUrl ||
    badge?.badge_image?.src ||
    badge?.badge_image?.url ||
    badge?.badge_image?.image_url ||
    badge?.badgeImage?.src ||
    badge?.badgeImage?.url ||
    badge?.badgeImage?.imageUrl ||
    badge?.image?.src ||
    badge?.image?.url ||
    badge?.image ||
    badge?.url ||
    badge?.icon ||
    badge?.src ||
    "";

  return typeof url === "string" ? url : "";
}

/*
 * Subscriber badges need a stricter parser than ordinary chat badges.
 * Kick's channel API exposes them as:
 *   subscriber_badges[].months
 *   subscriber_badges[].badge_image.src
 *
 * Do NOT recursively scan every object for anything containing "sub".
 * That can mistake sub_gifter and other identity badges for subscriber art.
 */
function getSubscriberBadgeImageUrl(badge = {}) {
  const direct =
    badge?.badge_image?.src ||
    badge?.badgeImage?.src ||
    badge?.image_url ||
    badge?.imageUrl ||
    badge?.url ||
    badge?.src ||
    "";

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const srcset =
    badge?.badge_image?.srcset ||
    badge?.badgeImage?.srcset ||
    "";

  if (typeof srcset === "string" && srcset.trim()) {
    const firstCandidate = srcset
      .split(",")
      .map(part => part.trim().split(/\s+/)[0])
      .find(Boolean);

    return firstCandidate || "";
  }

  return "";
}

function getKickBotStreamerInfo() {
  try {
    if (
      typeof globalValues !== "undefined" &&
      globalValues?.streamerInfo?.kick
    ) {
      return globalValues.streamerInfo.kick;
    }
  } catch (error) {
    debugWarn("Could not read KickBot globalValues:", error);
  }

  return window?.globalValues?.streamerInfo?.kick || null;
}

function normalizeKickChannelSlug(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(?:www\.)?kick\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase();
}

function getKickChannelSlugFromEvent(data = {}) {
  const streamerInfo = getKickBotStreamerInfo();

  const candidates = [
    streamerInfo?.slug,
    streamerInfo?.username,
    data?.streamer?.slug,
    data?.streamer?.username,
    data?.channel?.slug,
    data?.channel?.username,
    data?.channel_slug,
    data?.channelSlug,
    data?.broadcaster?.slug,
    data?.broadcaster?.username,
    data?.chatroom?.channel?.slug,
    data?.chatroom?.channel?.username,
    data?.metadata?.streamer?.slug,
    data?.metadata?.streamer?.username,
    data?.metadata?.channel?.slug,
    data?.metadata?.channel?.username,
    data?.metadata?.channel_slug,
    data?.metadata?.channelSlug
  ];

  try {
    const params = new URLSearchParams(window.location.search);

    candidates.push(
      params.get("channel"),
      params.get("channelSlug"),
      params.get("channel_slug"),
      params.get("streamer"),
      params.get("username"),
      params.get("slug")
    );
  } catch (error) {
    debugWarn("Could not inspect widget URL for channel slug:", error);
  }

  const slug = candidates
    .map(normalizeKickChannelSlug)
    .find(Boolean) || "";

  debugGroup("Kick Channel Slug Detection", {
    slug,
    candidates,
    rawData: data
  });

  return slug;
}

function getSubscriberBadgeMonth(badge = {}, fallbackMonth = 1) {
  const value =
    badge?.months ??
    badge?.month ??
    badge?.count ??
    badge?.duration ??
    badge?.tenure ??
    badge?.minimum_months ??
    badge?.minimumMonths ??
    badge?.months_required ??
    badge?.monthsRequired ??
    fallbackMonth;

  const month = Number(value);
  return Number.isFinite(month) && month > 0 ? month : 1;
}

function getExplicitSubscriberBadgeCollection(source) {
  if (!source) return [];

  /*
   * If the caller passed the known subscriber_badges array itself, it is safe.
   * We intentionally do not accept arbitrary nested arrays.
   */
  if (Array.isArray(source)) return source;

  if (typeof source !== "object") return [];

  const candidates = [
    source?.subscriber_badges,
    source?.subscriberBadges,
    source?.subscription_badges,
    source?.subscriptionBadges,
    source?.sub_badges,
    source?.subBadges,

    source?.channel?.subscriber_badges,
    source?.channel?.subscriberBadges,
    source?.data?.subscriber_badges,
    source?.data?.subscriberBadges,
    source?.streamer?.subscriber_badges,
    source?.streamer?.subscriberBadges,
    source?.kick?.subscriber_badges,
    source?.kick?.subscriberBadges,

    source?.metadata?.channel?.subscriber_badges,
    source?.metadata?.channel?.subscriberBadges,
    source?.metadata?.streamer?.subscriber_badges,
    source?.metadata?.streamer?.subscriberBadges
  ];

  return candidates.find(Array.isArray) || [];
}

function buildDynamicSubscriberBadgeMap(source) {
  const badges = getExplicitSubscriberBadgeCollection(source);
  const map = {};

  badges.forEach((badge, index) => {
    if (!badge || typeof badge !== "object") return;

    /*
     * A true channel subscriber-badge object normally has a months value and
     * badge_image. If a type is present, require it to be exactly subscriber /
     * subscription so sub_gifter can NEVER enter this map.
     */
    const type = String(
      badge?.type ||
      badge?.badge_type ||
      badge?.badgeType ||
      ""
    ).toLowerCase().trim();

    if (type && type !== "subscriber" && type !== "subscription") {
      return;
    }

    const url = getSubscriberBadgeImageUrl(badge);
    if (!url) return;

    const month = getSubscriberBadgeMonth(badge, index + 1);
    map[month] = url;
  });

  debugGroup("Dynamic Subscriber Badge Map Built", {
    badges,
    map,
    source
  });

  return map;
}

async function loadChannelSubscriberBadges(channelSlug) {
  const slug = normalizeKickChannelSlug(channelSlug);
  if (!slug) return false;

  if (
    slug === subscriberBadgeChannelSlug &&
    Object.keys(dynamicSubscriberBadgeImages).length
  ) {
    return true;
  }

  if (subscriberBadgeLoadPromise && slug === subscriberBadgeChannelSlug) {
    return subscriberBadgeLoadPromise;
  }

  if (slug !== subscriberBadgeChannelSlug) {
    dynamicSubscriberBadgeImages = {};
  }

  subscriberBadgeChannelSlug = slug;

  subscriberBadgeLoadPromise = (async () => {
    const endpoint =
      `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`;

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        debugWarn(
          "Live Kick subscriber badge endpoint failed:",
          endpoint,
          response.status
        );
        dynamicSubscriberBadgeImages = {};
        return false;
      }

      const channelData = await response.json();
      const liveChannelId = channelData?.id;

      /*
       * IMPORTANT:
       * KickBot's streamerInfo subscriber_badges can be stale.
       * Only trust the LIVE Kick v2 channel response.
       *
       * Also reject any badge whose channel_id does not match the channel
       * returned by this exact request.
       */
      const liveSubscriberBadges = Array.isArray(channelData?.subscriber_badges)
        ? channelData.subscriber_badges.filter(badge => {
            if (!badge || typeof badge !== "object") return false;

            const badgeChannelId =
              badge?.channel_id ??
              badge?.channelId ??
              null;

            if (
              liveChannelId !== undefined &&
              liveChannelId !== null &&
              badgeChannelId !== undefined &&
              badgeChannelId !== null &&
              String(badgeChannelId) !== String(liveChannelId)
            ) {
              debugWarn(
                "Rejected subscriber badge from wrong channel:",
                {
                  slug,
                  liveChannelId,
                  badgeChannelId,
                  badge
                }
              );
              return false;
            }

            return true;
          })
        : [];

      const map = buildDynamicSubscriberBadgeMap(liveSubscriberBadges);

      if (!Object.keys(map).length) {
        debugWarn(
          "Live Kick channel returned no usable subscriber badges:",
          {
            slug,
            liveChannelId,
            subscriber_badges: channelData?.subscriber_badges
          }
        );

        dynamicSubscriberBadgeImages = {};
        return false;
      }

      dynamicSubscriberBadgeImages = map;

      debugGroup("LIVE Kick Subscriber Badges Loaded", {
        slug,
        endpoint,
        liveChannelId,
        liveSubscriberBadges,
        dynamicSubscriberBadgeImages,
        channelData
      });

      return true;
    } catch (error) {
      debugError(
        "Live Kick subscriber badge lookup failed:",
        endpoint,
        error
      );

      dynamicSubscriberBadgeImages = {};
      return false;
    }
  })();

  try {
    return await subscriberBadgeLoadPromise;
  } finally {
    subscriberBadgeLoadPromise = null;
  }
}

async function ensureDynamicSubscriberBadges(data = {}) {
  /*
   * KickBot's streamer object is used ONLY to identify the connected channel.
   * Its subscriber_badges collection is intentionally ignored because we
   * confirmed it can contain stale/wrong artwork.
   */
  const streamerInfo = getKickBotStreamerInfo();

  const streamerSlug = normalizeKickChannelSlug(
    streamerInfo?.slug || streamerInfo?.username
  );

  const eventSlug = getKickChannelSlugFromEvent(data);
  const slug = streamerSlug || eventSlug;

  if (!slug) {
    debugWarn(
      "Could not resolve the connected Kick channel; subscriber badge will be omitted."
    );

    dynamicSubscriberBadgeImages = {};
    subscriberBadgeChannelSlug = "";
    return false;
  }

  debugGroup("Subscriber Badge Source Selected", {
    source: "LIVE Kick v2 channel API only",
    slug,
    ignoredKickBotSubscriberBadges:
      streamerInfo?.subscriber_badges || [],
    rawData: data
  });

  return loadChannelSubscriberBadges(slug);
}

function getSubscriberBadgeUrl(months, badge = {}) {
  months = Number(months) || 1;

  /*
   * IMPORTANT:
   * KickBot's live chat badge object can contain a generic/non-channel
   * subscriber image. Zay's actual custom subscription artwork is loaded
   * separately from streamerInfo.kick.subscriber_badges.
   *
   * Therefore the connected channel's badge map MUST win.
   */
  const dynamicMonths = Object.keys(dynamicSubscriberBadgeImages)
    .map(Number)
    .filter(month => month <= months)
    .sort((a, b) => b - a);

  const dynamicMonth = dynamicMonths[0];

  if (dynamicMonth) {
    const badgeUrl = dynamicSubscriberBadgeImages[dynamicMonth];

    debugGroup("Subscriber Badge Resolved", {
      source: "connected-channel-subscriber-badges",
      channel: subscriberBadgeChannelSlug,
      months,
      unlockedMonth: dynamicMonth,
      badgeUrl,
      ignoredEventBadge: badge
    });

    return badgeUrl;
  }

  /*
   * Emergency fallback only:
   * Accept an event-provided image if it is unmistakably one of Kick's
   * channel subscriber badge assets. This prevents founder, sub-gifter,
   * generic level, or other badge art from ever occupying the sub slot.
   */
  const directUrl = getSubscriberBadgeImageUrl(badge);
  const isRealChannelSubscriberBadge =
    directUrl &&
    /\/channel_subscriber_badges\//i.test(String(directUrl));

  if (isRealChannelSubscriberBadge) {
    debugGroup("Subscriber Badge Resolved", {
      source: "event-channel-subscriber-badge-fallback",
      months,
      badgeUrl: directUrl,
      badge
    });

    return directUrl;
  }

  debugGroup("Subscriber Badge Omitted", {
    reason:
      "No connected-channel subscriber badge was available and the event image was not a verified channel_subscriber_badges asset.",
    channel: subscriberBadgeChannelSlug,
    months,
    eventBadgeUrl: directUrl || "",
    badge,
    dynamicSubscriberBadgeImages
  });

  return "";
}

function buildReplyPreview(data) {
  if (data.type !== "reply") return null;

  const originalUsername =
    data.metadata?.original_sender?.username ||
    data.metadata?.original_sender?.slug ||
    "someone";

  const originalMessage =
    data.metadata?.original_message?.content ||
    data.metadata?.original_message?.message ||
    "";

  const cleanMessage = String(originalMessage)
    .replace(/\s+/g, " ")
    .trim();

  const shortMessage =
    cleanMessage.length > 35
      ? cleanMessage.slice(0, 35) + "..."
      : cleanMessage;

  const replyPreview = `${originalUsername}: ${shortMessage}`;

  debugGroup("Reply Preview Built", {
    type: data.type,
    originalUsername,
    originalMessage,
    replyPreview,
    rawData: data
  });

  return replyPreview;
}

function normalize7TVColor(color) {
  if (color === null || color === undefined) return "";

  if (typeof color === "string") {
    const value = color.trim();

    if (value.startsWith("#") || value.startsWith("rgb")) {
      return safeCSSValue(value);
    }

    if (/^[0-9a-fA-F]{6}$/.test(value)) {
      return "#" + value;
    }

    if (/^[0-9a-fA-F]{8}$/.test(value)) {
      return "#" + value;
    }

    if (!/^-?\d+$/.test(value)) {
      return safeCSSValue(value);
    }

    color = Number(value);
  }

  if (typeof color !== "number" || !Number.isFinite(color)) {
    return "";
  }

  /*
    7TV stores paint colors as RRGGBBAA. Keep the alpha byte instead
    of discarding it so translucent paint stops match 7TV itself.
  */
  const value = color >>> 0;
  const r = (value >>> 24) & 0xff;
  const g = (value >>> 16) & 0xff;
  const b = (value >>> 8) & 0xff;
  const a = (value & 0xff) / 255;

  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(4))})`;
}

function normalizePaintPercentPair(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;

  const x = Number(value[0]);
  const y = Number(value[1]);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return [x, y];
}

function createSevenTVGradientLayer(gradient = {}, legacy = false) {
  const fn = String(gradient.function || "").toUpperCase();
  const stops = Array.isArray(gradient.stops) ? gradient.stops : [];

  let image = "";

  if (fn === "URL" || gradient.image_url) {
    if (!gradient.image_url) return null;
    image = `url('${escapeHTML(gradient.image_url)}')`;
  } else {
    const cssStops = stops
      .map(stop => {
        const color = normalize7TVColor(stop.color);
        const rawAt = Number(stop.at);

        if (!color || !Number.isFinite(rawAt)) return "";

        const at = rawAt <= 1 ? rawAt * 100 : rawAt;
        return `${color} ${at}%`;
      })
      .filter(Boolean);

    if (!cssStops.length) return null;

    const prefix = gradient.repeat ? "repeating-" : "";

    if (fn.includes("RADIAL")) {
      image =
        `${prefix}radial-gradient(` +
        `${safeCSSValue(gradient.shape || "circle")}, ` +
        `${cssStops.join(", ")})`;
    } else {
      /*
        7TV treats an explicitly supplied 0-degree angle as 0.
        Do not use `|| 90`, which silently converts 0 to 90.
      */
      const angleValue = Number(gradient.angle);
      const angle = Number.isFinite(angleValue) ? angleValue : 0;

      image =
        `${prefix}linear-gradient(` +
        `${angle}deg, ${cssStops.join(", ")})`;
    }
  }

  const positionPair = normalizePaintPercentPair(gradient.at);
  const position = positionPair
    ? `${positionPair[0] * 100}% ${positionPair[1] * 100}%`
    : "0% 0%";

  /*
    The old API called this canvas_size; the extension-side model
    calls it size. Support both shapes.
  */
  const sizePair =
    normalizePaintPercentPair(gradient.size) ||
    normalizePaintPercentPair(gradient.canvas_size);

  const size = sizePair
    ? `${sizePair[0] * 100}% ${sizePair[1] * 100}%`
    : (legacy ? "100% 100%" : "auto");

  /*
    canvas_repeat controls CSS background-repeat. This is separate
    from gradient.repeat, which controls repeating-linear/radial-gradient.
  */
  const canvasRepeat = safeCSSValue(
    gradient.canvas_repeat ||
    gradient.canvasRepeat ||
    "repeat"
  );

  return {
    image,
    position,
    size,
    repeat: canvasRepeat
  };
}

function getPaintStyle(paint) {
  if (!paint) {
    return {
      style: "",
      canClipText: false
    };
  }

  /*
    Old 7TV REST style.paint objects expose the paint fields directly.
    Newer objects may wrap them under .data. Handle either shape.
  */
  const model = paint?.data && typeof paint.data === "object"
    ? paint.data
    : paint;

  let gradients = [];
  let usingLegacyGradient = false;

  if (Array.isArray(model.gradients) && model.gradients.length) {
    gradients = model.gradients;
  } else if (
    model.function ||
    model.image_url ||
    (Array.isArray(model.stops) && model.stops.length)
  ) {
    /*
      Match 7TV's own v2 compatibility behavior: legacy paints become
      one 100% x 100% layer.
    */
    usingLegacyGradient = true;
    gradients = [{
      function: model.function,
      canvas_repeat: "",
      size: [1, 1],
      shape: model.shape,
      image_url: model.image_url,
      stops: model.stops || [],
      repeat: model.repeat || false,
      angle: model.angle
    }];
  }

  const layers = gradients
    .map(gradient => createSevenTVGradientLayer(
      gradient,
      usingLegacyGradient
    ))
    .filter(Boolean);

  let style = "";
  let canClipText = layers.length > 0;

  if (layers.length) {
    style += `background-image:${layers.map(layer => layer.image).join(", ")};`;
    style += `background-position:${layers.map(layer => layer.position).join(", ")};`;
    style += `background-size:${layers.map(layer => layer.size).join(", ")};`;
    style += `background-repeat:${layers.map(layer => layer.repeat).join(", ")};`;
  }

  if (!layers.length && model.color !== null && model.color !== undefined) {
    const color = normalize7TVColor(model.color);

    if (color) {
      style += `color:${color} !important;`;
      style += `-webkit-text-fill-color:${color} !important;`;
    }
  }

  if (Array.isArray(model.shadows) && model.shadows.length) {
    const filterString = model.shadows
      .map(shadow => {
        const color = normalize7TVColor(shadow.color);
        return `drop-shadow(${shadow.x_offset || 0}px ${
          shadow.y_offset || 0
        }px ${shadow.radius || 0}px ${color})`;
      })
      .join(" ");

    style += `filter:${filterString} !important;`;
  } else {
    style += "filter:none !important;";
  }

  const text = model.text || {};

  if (text.weight) {
    style += `font-weight:${Number(text.weight) * 100} !important;`;
  }

  if (text.stroke) {
    const strokeWidth = Number(text.stroke.width);
    const strokeColor = normalize7TVColor(text.stroke.color);

    if (Number.isFinite(strokeWidth)) {
      style += `-webkit-text-stroke-width:${strokeWidth}px !important;`;
    }

    if (strokeColor) {
      style += `-webkit-text-stroke-color:${strokeColor} !important;`;
    }
  }

  if (Array.isArray(text.shadows) && text.shadows.length) {
    const textShadow = text.shadows
      .map(shadow => {
        const color = normalize7TVColor(shadow.color);
        return `${shadow.x_offset || 0}px ${shadow.y_offset || 0}px ${
          shadow.radius || 0
        }px ${color}`;
      })
      .join(", ");

    style += `text-shadow:${textShadow} !important;`;
  } else {
    style += "text-shadow:none !important;";
  }

  if (text.transform) {
    style += `text-transform:${safeCSSValue(text.transform)} !important;`;
  }

  debugGroup("7TV Paint Style Built", {
    paint,
    model,
    gradients,
    layers,
    usingLegacyGradient,
    style,
    canClipText
  });

  return {
    style,
    canClipText
  };
}

function parseEmotes(message) {
  return String(message)
    .split(/(\s+)/)
    .map(part => {
      if (part.trim() === "") return part;

      let parsedPart = "";

      const kickEmotePattern = /\[emote:(\d+):([^\]]+)\]/g;
      let lastIndex = 0;
      let match;

      while ((match = kickEmotePattern.exec(part)) !== null) {
        parsedPart += parseNativeEmoji(
  part.slice(lastIndex, match.index)
);

        const emoteId = match[1];
        const emoteName = match[2];

        debugGroup("Kick Emote Parsed", {
          emoteId,
          emoteName,
          rawPart: part
        });

        parsedPart += `<img
          class="emote kick-emote"
          src="https://files.kick.com/emotes/${emoteId}/fullsize"
          alt="${escapeHTML(emoteName)}"
          title="${escapeHTML(emoteName)}"
        >`;

        lastIndex = kickEmotePattern.lastIndex;
      }

      if (lastIndex > 0) {
        parsedPart += parseNativeEmoji(
  part.slice(lastIndex)
);
        return parsedPart;
      }

      const textMatch = part.match(/^([^\w]*)([\w]+)([^\w]*)$/);
      if (!textMatch) return parseNativeEmoji(part);

      const prefix = textMatch[1];
      const word = textMatch[2];
      const suffix = textMatch[3];

      if (sevenTVEmotes[word]) {
        const emoteId = sevenTVEmotes[word];

        debugGroup("7TV Emote Parsed", {
          word,
          emoteId,
          rawPart: part
        });

        return `${parseNativeEmoji(prefix)}<img
          class="emote seventv-emote"
          src="https://cdn.7tv.app/emote/${emoteId}/4x.webp"
          alt="${escapeHTML(word)}"
          title="${escapeHTML(word)}"
        >${parseNativeEmoji(suffix)}`;
      }

      return parseNativeEmoji(part);
    })
    .join("");
}

function normalizeKickChatBadgeType(type) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getKickMessageBadgeGroups(data = {}) {
  const sender = data?.sender || {};
  const identity = sender?.identity || data?.identity || {};

  const legacyCandidates = [
    identity?.badges,
    sender?.badges,
    data?.badges
  ];
  const badges = legacyCandidates.find(Array.isArray) || [];

  const v2Candidates = [
    identity?.badges_v2,
    identity?.badgesV2,
    sender?.badges_v2,
    sender?.badgesV2,
    data?.badges_v2,
    data?.badgesV2,
    data?.metadata?.badges_v2,
    data?.metadata?.badgesV2
  ];
  const badgesV2 = (v2Candidates.find(Array.isArray) || []).filter(
    badge => badge && badge.selected !== false
  );

  return { badges, badgesV2 };
}

function getKickMessageBadgeImageUrl(badge = {}) {
  return String(
    badge?.image_url ||
    badge?.imageUrl ||
    badge?.badge_image?.src ||
    badge?.badgeImage?.src ||
    badge?.url ||
    badge?.src ||
    ""
  ).trim();
}

function getKickDirectBadgeFallback(badges = [], badgesV2 = []) {
  // If the Worker is unreachable, show only images supplied by the live event.
  // Never reintroduce hardcoded generic KickBot or deleted ImgBB icons.
  return [...badgesV2, ...badges]
    .filter(badge =>
      normalizeKickChatBadgeType(
        badge?.badge_type || badge?.badgeType || badge?.type || badge?.name
      ) !== "subscriber"
    )
    .map(badge => ({
      type: normalizeKickChatBadgeType(
        badge?.badge_type || badge?.badgeType || badge?.type || badge?.name
      ),
      text: String(badge?.text || badge?.title || badge?.name || badge?.type || "Badge"),
      imageUrl: getKickMessageBadgeImageUrl(badge)
    }))
    .filter(badge => badge.type && /^https:\/\//i.test(badge.imageUrl));
}

async function loadKickNativeBadges(channelSlug, badges = [], badgesV2 = []) {
  const slug = normalizeKickChannelSlug(channelSlug);
  const nonSubscriber = badge =>
    normalizeKickChatBadgeType(
      badge?.badge_type || badge?.badgeType || badge?.type || badge?.name
    ) !== "subscriber";

  const requestBadges = badges.filter(nonSubscriber);
  const requestV2 = badgesV2.filter(
    badge => badge?.selected !== false && nonSubscriber(badge)
  );

  if (!requestBadges.length && !requestV2.length) return [];

  const directFallback = getKickDirectBadgeFallback(requestBadges, requestV2);
  if (!slug) {
    debugWarn("Kick badge Worker lookup skipped: missing channel slug.");
    return directFallback;
  }

  const key = JSON.stringify([slug, requestBadges, requestV2]);
  const cached = kickBadgeRequestCache.get(key);
  if (cached && Date.now() - cached.savedAt < KICK_BADGE_REQUEST_CACHE_MS) {
    return cached.badges;
  }
  if (kickBadgeRequestLoading.has(key)) {
    return kickBadgeRequestLoading.get(key);
  }

  const loading = (async () => {
    try {
      const url = new URL(KICK_BADGE_WORKER_URL);
      url.searchParams.set("channel", slug);
      url.searchParams.set("badges", JSON.stringify(requestBadges));
      url.searchParams.set("badgesV2", JSON.stringify(requestV2));

      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Kick badge Worker HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.success !== true || !Array.isArray(data?.resolvedBadges)) {
        throw new Error(data?.error || "Kick badge Worker returned invalid badge data.");
      }

      const resolved = data.resolvedBadges.filter(badge =>
        badge && nonSubscriber(badge) &&
        (badge.imageSvg || badge.image_svg || badge.imageUrl || badge.image_url)
      );

      debugGroup("Native Kick Badges Resolved", {
        channel: slug,
        inputLegacy: requestBadges,
        inputV2: requestV2,
        resolved,
        unresolved: data.unresolvedBadges || []
      });

      kickBadgeRequestCache.set(key, {
        savedAt: Date.now(),
        badges: resolved
      });
      return resolved;
    } catch (error) {
      debugWarn("Native Kick badge lookup failed; using event images if available:", error);
      return directFallback;
    } finally {
      kickBadgeRequestLoading.delete(key);
    }
  })();

  kickBadgeRequestLoading.set(key, loading);
  return loading;
}

function renderNativeKickBadges(resolvedBadges = []) {
  return resolvedBadges
    .map(badge => {
      const label = String(badge?.text || badge?.title || badge?.type || "Kick badge");
      const svg = String(badge?.imageSvg || badge?.image_svg || "").trim();

      // Keeping an <img class="badge"> preserves the EXISTING KickBot CSS.
      // SVGs returned by our Worker become self-contained image URLs.
      const imageUrl = svg.startsWith("<svg") && svg.endsWith("</svg>")
        ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
        : String(badge?.imageUrl || badge?.image_url || "").trim();

      if (!imageUrl || !/^(?:data:image\/svg\+xml|https:\/\/)/i.test(imageUrl)) {
        return "";
      }

      return `<img class="badge" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(label)}" title="${escapeHTML(label)}">`;
    })
    .join("");
}

function renderBadges(badges = [], badgesV2 = []) {
  // Protect the EXISTING channel-specific live subscriber badge resolver.
  // All other Kick badges are provided by renderNativeKickBadges().
  const legacySubscribers = badges.filter(badge =>
    normalizeKickChatBadgeType(badge?.type || badge?.name) === "subscriber"
  );
  const selectedV2Subscribers = badgesV2.filter(badge =>
    badge?.selected !== false &&
    normalizeKickChatBadgeType(
      badge?.badge_type || badge?.badgeType || badge?.type || badge?.name
    ) === "subscriber"
  );
  const subscribers = legacySubscribers.length
    ? legacySubscribers
    : selectedV2Subscribers;

  return subscribers
    .map(badge => {
      const months =
        badge?.metadata?.level ||
        badge?.count ||
        badge?.months ||
        badge?.month ||
        1;
      const imageUrl = getSubscriberBadgeUrl(months, badge);
      if (!imageUrl) return "";
      const label = String(badge?.text || badge?.title || "Subscriber");
      return `<img class="badge" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(label)}" title="${escapeHTML(label)}">`;
    })
    .join("");
}

function shouldEmotePop(message) {
  const text = String(message || "").trim();

  if (!text) return false;

  const withoutKickEmotes = text
    .replace(/\[emote:\d+:[^\]]+\]/g, "")
    .trim();

  const words = withoutKickEmotes.split(/\s+/).filter(Boolean);

  const hasKickEmote = /\[emote:\d+:[^\]]+\]/.test(text);
  const allRemainingAre7TV = words.every(word => sevenTVEmotes[word]);

  const shouldPop =
    (hasKickEmote && words.length === 0) ||
    (allRemainingAre7TV && words.length > 0);

  debugGroup("Emote Pop Check", {
    message,
    hasKickEmote,
    words,
    allRemainingAre7TV,
    shouldPop
  });

  return shouldPop;
}

async function addMessage({
  username,
  profilePicture = "",
  replyTo = null,
  message,
  badges = [],
  badgesV2 = [],
  resolvedKickBadges = [],
  sevenTVBadge = "",
  paintData = null,
  nameColor = "",
  type = "chat"
}) {
  await twemojiReady;
  
  if (!username || !message) {
    debugWarn("Message skipped: missing username or message.", { username, message });
    return;
  }

  if (isBot(username)) {
    debugLog("Message skipped: ignored bot.", username);
    return;
  }

  const messageEl = document.createElement("div");

  if (type === "tip") {
    messageEl.className = "chat-message tip-message";
  } else if (type === "tts") {
    messageEl.className = "chat-message tts-message";
  } else {
    messageEl.className = "chat-message";
  }

  /* Make --message-boxes: 0 a true hard off-state instead of relying
     only on calculated CSS values. */
  const messageBoxesValue = getComputedStyle(document.documentElement)
    .getPropertyValue("--message-boxes")
    .trim();

  if (Number(messageBoxesValue) === 0) {
    messageEl.classList.add("no-box");
  }

  if (shouldEmotePop(message)) {
    messageEl.classList.add("emote-pop");
  }

  if (isNativeEmojiOnly(message)) {
    messageEl.classList.add("native-emoji-only");
  }

  const safeNameColor = nameColor || "#ffffff";
  const paintResult = getPaintStyle(paintData);
  const paintStyle = paintResult.style;
  const hasPaintBackground = paintResult.canClipText;

  debugGroup("Message Render Data", {
    username,
    profilePicture,
    replyTo,
    message,
    badges,
    badgesV2,
    resolvedKickBadges,
    sevenTVBadge,
    paintData,
    safeNameColor,
    paintResult,
    type
  });

  messageEl.innerHTML = `
    ${
      replyTo
        ? `
          <div class="reply-indicator">
            ↳ ${escapeHTML(replyTo)}
          </div>
        `
        : ""
    }

    ${
      profilePicture
        ? `<img class="profile-picture" src="${escapeHTML(profilePicture)}" alt="">`
        : ""
    }

    <span class="badges">
      ${
        sevenTVBadge
          ? `<img class="badge" src="${escapeHTML(sevenTVBadge)}" alt="7TV badge">`
          : ""
      }
      ${renderBadges(badges, badgesV2)}
      ${renderNativeKickBadges(resolvedKickBadges)}
    </span>

    <span
      class="username-wrap"
      style="color:${escapeHTML(safeNameColor)};"
    >
      <span
        class="username-base"
        style="${
          hasPaintBackground
            ? "color:transparent !important;-webkit-text-fill-color:transparent !important;"
            : ""
        }"
      >
        ${escapeHTML(username)}:
      </span>

      ${
        hasPaintBackground
          ? `<span
              class="username-paint"
              style="${paintStyle}"
            >
              ${escapeHTML(username)}:
            </span>`
          : ""
      }
    </span>

    <span class="message-text">${parseEmotes(message)}</span>
  `;

  debugGroup("Final Message HTML", {
    username,
    html: messageEl.innerHTML
  });

  const messageTextEl = messageEl.querySelector(".message-text");

  /*
   * Attach the Fluent-to-Twemoji fallback before any Fluent emoji
   * begins loading. This preserves complete graphemes, skin tones,
   * flags, keycaps and ZWJ sequences in the KickBot widget.
   */
  messageTextEl
    ?.querySelectorAll(
      "img.native-emoji[data-fluent-src][data-fallback]"
    )
    .forEach(image => {
      image.addEventListener(
        "error",
        function handleFluentError() {
          const fallback = this.dataset.fallback;

          if (fallback && this.src !== fallback) {
            debugWarn(
              "Fluent asset missing; using Twemoji fallback:",
              this.alt
            );

            this.src = fallback;
          }
        },
        { once: true }
      );

      image.src = image.dataset.fluentSrc;
    });

  chatContainer.appendChild(messageEl);

  setTimeout(() => {
  if (messageEl.parentNode === chatContainer) {
    chatContainer.removeChild(messageEl);
  }
}, MESSAGE_LIFETIME);

  while (chatContainer.children.length > maxMessages) {
    debugLog("Max messages exceeded. Removing oldest message.");
    chatContainer.removeChild(chatContainer.firstChild);
  }
}

document.addEventListener("widgetEvent", handleWidgetEvent);

function handleWidgetEvent(event) {
  debugGroup("Raw Widget Event", {
    event
  });

  const eventName = event.detail?.event_name;
  const data = event.detail?.data;

  debugGroup("Parsed Widget Event", {
    eventName,
    data
  });

  if (!eventName || !data) {
    debugWarn("Widget event skipped: missing eventName or data.");
    return;
  }

  if (eventName === "chatMessageEvent") {
    const username = data.sender?.username;
    const slug = data.sender?.slug;
    const nameColor = data.sender?.identity?.color || "";
    const replyTo = buildReplyPreview(data);
    const { badges, badgesV2 } = getKickMessageBadgeGroups(data);

    debugGroup("Kick Chat Message Incoming", {
      username,
      slug,
      nameColor,
      replyTo,
      message: data.content,
      sender: data.sender,
      badges: data.sender?.identity?.badges || [],
      rawData: data
    });

    loadKickProfilePicture(slug, nameColor).then(profilePicture => {
      const kickUserId = getKickUserIdFromSender(data.sender, profilePicture);

      debugGroup("Kick User ID Resolved", {
        username,
        slug,
        kickUserId,
        profilePicture
      });

      return Promise.all([
        loadSevenTVCosmetics(username, kickUserId),
        Promise.resolve(profilePicture),
        Promise.resolve(kickUserId),
        ensureDynamicSubscriberBadges(data),
        loadKickNativeBadges(getKickChannelSlugFromEvent(data), badges, badgesV2)
      ]);
    }).then(([cosmetics, profilePicture, kickUserId, , resolvedKickBadges]) => {
      const useEasterPaint = shouldUseEasterPaint(username);

      const selectedPaintData = cosmetics?.paintData || null;

      debugGroup("Resolved Kick + 7TV Chat Info", {
        username,
        slug,
        kickUserId,
        nameColor,
        profilePicture,
        cosmetics,
        sevenTVBadge: cosmetics?.badgeUrl || "",
        useEasterPaint,
        easterPaintData,
        selectedPaintData,
        rawData: data
      });

      addMessage({
        username,
        profilePicture,
        message: data.content,
        badges,
        badgesV2,
        resolvedKickBadges,
        sevenTVBadge: cosmetics?.badgeUrl || "",
        paintData: selectedPaintData,
        replyTo,
        nameColor,
        type: "chat"
      });
    });

    return;
  }

  if (eventName === "tipEvent") {
    debugGroup("Tip Event", {
      data
    });

    const username = data.sender?.username || data.username || "Someone";
    const nameColor = data.sender?.identity?.color || "";

    const { badges, badgesV2 } = getKickMessageBadgeGroups(data);
    Promise.all([
      ensureDynamicSubscriberBadges(data),
      loadKickNativeBadges(getKickChannelSlugFromEvent(data), badges, badgesV2)
    ]).then(([, resolvedKickBadges]) => {
      addMessage({
        username,
        profilePicture: getClosestFallbackProfilePicture(nameColor),
        message: data.content || data.message || "sent a tip",
        badges,
        badgesV2,
        resolvedKickBadges,
        nameColor,
        type: "tip"
      });
    }).catch(error => debugError("tip badge rendering failed:", error));

    return;
  }

  if (eventName === "ttsEvent") {
    debugGroup("TTS Event", {
      data
    });

    const username = data.sender?.username || data.username || "Someone";
    const nameColor = data.sender?.identity?.color || "";

    const { badges, badgesV2 } = getKickMessageBadgeGroups(data);
    Promise.all([
      ensureDynamicSubscriberBadges(data),
      loadKickNativeBadges(getKickChannelSlugFromEvent(data), badges, badgesV2)
    ]).then(([, resolvedKickBadges]) => {
      addMessage({
        username,
        profilePicture: getClosestFallbackProfilePicture(nameColor),
        message: data.content || data.message || "sent a TTS",
        badges,
        badgesV2,
        resolvedKickBadges,
        nameColor,
        type: "tts"
      });
    }).catch(error => debugError("tts badge rendering failed:", error));

    return;
  }

  debugGroup("Unhandled Widget Event", {
    eventName,
    data
  });
}
