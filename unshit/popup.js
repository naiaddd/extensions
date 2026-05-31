// Popup logic — load current settings into the form, save them back.

const DEFAULTS = { minSeconds: 0, hideUnknownDuration: false, blocked: [], listMode: false, listTextOnly: false, listHideAvatars: false, listLowercase: false };

const minutesEl = document.getElementById('minutes');
const hideUnknownEl = document.getElementById('hideUnknown');
const blockedEl = document.getElementById('blocked');
const listModeEl = document.getElementById('listMode');
const listTextOnlyEl = document.getElementById('listTextOnly');
const textOnlyFieldEl = document.getElementById('textOnlyField');
const listHideAvatarsEl = document.getElementById('listHideAvatars');
const avatarsFieldEl = document.getElementById('avatarsField');
const listLowercaseEl = document.getElementById('listLowercase');
const lowercaseFieldEl = document.getElementById('lowercaseField');
const statusEl = document.getElementById('status');

// The list sub-options only apply when list view is on; grey them out otherwise.
function syncListSubOptions() {
  const on = listModeEl.checked;
  listTextOnlyEl.disabled = !on;
  listHideAvatarsEl.disabled = !on;
  listLowercaseEl.disabled = !on;
  textOnlyFieldEl.style.opacity = on ? '1' : '0.4';
  avatarsFieldEl.style.opacity = on ? '1' : '0.4';
  lowercaseFieldEl.style.opacity = on ? '1' : '0.4';
}

async function load() {
  const s = await browser.storage.sync.get(DEFAULTS);
  minutesEl.value = Math.round((s.minSeconds || 0) / 60);
  hideUnknownEl.checked = !!s.hideUnknownDuration;
  blockedEl.value = (s.blocked || []).join('\n');
  listModeEl.checked = !!s.listMode;
  listTextOnlyEl.checked = !!s.listTextOnly;
  listHideAvatarsEl.checked = !!s.listHideAvatars;
  listLowercaseEl.checked = !!s.listLowercase;
  syncListSubOptions();
}

async function save() {
  const minutes = Math.max(0, parseInt(minutesEl.value, 10) || 0);
  const blocked = blockedEl.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  await browser.storage.sync.set({
    minSeconds: minutes * 60,
    hideUnknownDuration: hideUnknownEl.checked,
    blocked,
    listMode: listModeEl.checked,
    listTextOnly: listModeEl.checked && listTextOnlyEl.checked,
    listHideAvatars: listModeEl.checked && listHideAvatarsEl.checked,
    listLowercase: listModeEl.checked && listLowercaseEl.checked
  });

  statusEl.classList.add('show');
  setTimeout(() => statusEl.classList.remove('show'), 1200);
}

listModeEl.addEventListener('change', syncListSubOptions);
document.getElementById('save').addEventListener('click', save);
load();
