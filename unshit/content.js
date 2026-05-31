// YouTube Declutter — content script
// Runs on every youtube.com page. Reads your settings, then hides video
// cards that are too short or belong to blocked creators. Re-runs whenever
// YouTube injects new cards (infinite scroll) or navigates between pages.

const DEFAULTS = {
  minSeconds: 0,            // hide videos shorter than this (0 = off)
  hideUnknownDuration: false, // hide cards with no readable duration (live, premieres, shorts shelves)
  blocked: [],              // list of channel names / @handles to hide
  listMode: false,
  listTextOnly: false,
  listHideAvatars: false,
  listLowercase: false
};

let settings = { ...DEFAULTS };

// The container tags YouTube uses for a single video card across its surfaces:
// home grid, search results, sidebar "up next", and old grid pages.
const CARD_SELECTOR = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-grid-video-renderer'
].join(',');

// "1:23:45" -> 5025 seconds, "12:34" -> 754 seconds, anything else -> null
function parseTimeString(str) {
  const m = String(str).trim().match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  if (m[3] !== undefined) return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
  return (+m[1]) * 60 + (+m[2]);
}

// Scan a card's visible text for time-like patterns and return the longest
// one in seconds. The video's own duration is almost always the longest
// timestamp present, so this survives YouTube renaming its CSS classes.
function findDurationSeconds(card) {
  const text = card.textContent || '';
  const matches = text.match(/\d{1,2}:\d{2}(?::\d{2})?/g);
  if (!matches) return null;
  let max = null;
  for (const t of matches) {
    const s = parseTimeString(t);
    if (s !== null && (max === null || s > max)) max = s;
  }
  return max;
}

// Returns true if this card's channel matches anything in the blocklist.
// Matches against both the visible channel name and the channel URL/@handle,
// case-insensitively, so "@veritasium" or "Veritasium" both work.
function isBlockedChannel(card) {
  if (!settings.blocked.length) return false;
  const nameEl = card.querySelector(
    'ytd-channel-name #text, ytd-channel-name a, #channel-name #text, .ytd-channel-name'
  );
  const linkEl = card.querySelector(
    'a[href*="/@"], a[href*="/channel/"], a[href*="/c/"], a[href*="/user/"]'
  );
  const name = nameEl ? nameEl.textContent : '';
  const href = linkEl ? linkEl.getAttribute('href') || '' : '';
  const hay = (name + ' ' + href).toLowerCase();
  return settings.blocked.some((b) => b && hay.includes(b.toLowerCase()));
}

function applyLayout() {
  const html = document.documentElement;
  html.classList.toggle('ytd-listmode', settings.listMode);
  html.classList.toggle('ytd-listmode-textonly', settings.listMode && settings.listTextOnly);
  html.classList.toggle('ytd-listmode-noavatars', settings.listMode && settings.listHideAvatars);
  html.classList.toggle('ytd-listmode-lowercase', settings.listMode && settings.listLowercase);
}

function applyToCard(card) {
  let hide = false;

  if (settings.minSeconds > 0) {
    const dur = findDurationSeconds(card);
    if (dur === null) {
      if (settings.hideUnknownDuration) hide = true;
    } else if (dur < settings.minSeconds) {
      hide = true;
    }
  }

  if (!hide && isBlockedChannel(card)) hide = true;

  if (hide) {
    card.style.display = 'none';
    card.dataset.ytdHidden = '1';
  } else if (card.dataset.ytdHidden) {
    // Un-hide if settings changed and it no longer matches.
    card.style.display = '';
    delete card.dataset.ytdHidden;
  }
}

function runAll() {
  document.querySelectorAll(CARD_SELECTOR).forEach(applyToCard);
}

// Coalesce bursts of DOM mutations into one pass per animation frame so we
// don't re-scan the page hundreds of times while scrolling.
let scheduled = false;
function scheduleRun() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    runAll();
  });
}

async function loadSettings() {
  try {
    const stored = await browser.storage.sync.get(DEFAULTS);
    settings = { ...DEFAULTS, ...stored };
  } catch (e) {
    settings = { ...DEFAULTS };
  }
}

// React instantly when you change settings in the popup.
browser.storage.onChanged.addListener(() => {
  loadSettings().then(() => { applyLayout(); runAll(); });
});

// YouTube is a single-page app: clicking around fires this custom event
// instead of a real page load, so we re-filter after each navigation.
window.addEventListener('yt-navigate-finish', scheduleRun);

(async function init() {
  await loadSettings();
  applyLayout();
  runAll();
  new MutationObserver(scheduleRun).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
