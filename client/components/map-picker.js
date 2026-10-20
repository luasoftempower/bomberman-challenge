import { MAP_FAMILIES, MAP_THEMES, STANDARD_MAPS, presetMap } from '../../shared/maps.js';
import { GAME_MODES } from '../../shared/constants.js';
import { paintMapPreview } from '../map-art.js';
import { loadMapLibrary, saveMapLibrary, MAX_SAVED_MAPS } from '../map-library.js';
import { text, t, attr, setText } from '../i18n/index.js';
import { escapeHtml } from '../utils/html.js';
import { openEditor, closeMapEditor as closeEditor } from './map-studio.js';

let activePicker = null;
let currentContext = null;
let filter = 'all';

export function closeMapEditor() {
  closeEditor();
  activePicker?.close();
  currentContext = null;
}

export function showMapError(key) {
  setText(activePicker?.querySelector('.picker-feedback') || document.querySelector('#map-feedback'), key || 'maps.invalid');
}

function library() { try { return loadMapLibrary(); } catch { return []; } }
function mapName(map) { return map.id === 'custom' ? map.name : t(map.nameKey, map.nameParams); }
function selectedMap(lobby) {
  return lobby.mapId === 'custom' ? lobby.customMap : STANDARD_MAPS.find((map) => map.id === lobby.mapId);
}
function sameCustom(a, b) {
  return a && b && ['grid', 'colors', 'name', 'theme'].every((key) => a[key] === b[key]);
}

export function mountMapStudio(root, lobby, isHost, send) {
  if (lobby.gameMode !== GAME_MODES.SUPER) { closeMapEditor(); return; }
  if (!isHost) closeEditor();
  currentContext = { root, lobby, isHost, send };
  const panel = document.createElement('section'); panel.className = 'map-panel map-panel-compact';
  const chosen = lobby.mapId === 'random' ? t('maps.random') : mapName(selectedMap(lobby) || STANDARD_MAPS[0]);
  const chooseActive = !['original', 'random'].includes(lobby.mapId);
  panel.innerHTML = `<header class="map-panel-heading"><div><span class="map-kicker">${text('maps.exclusive')}</span><h3>${text('maps.compactTitle')}</h3></div><p class="map-current">${text('maps.current')} <strong>${escapeHtml(chosen)}</strong></p></header><div class="map-mode-options" role="group" ${attr('aria-label', 'maps.compactTitle')}><button type="button" data-map-mode="original" aria-pressed="${lobby.mapId === 'original'}" ${!isHost ? 'disabled' : ''}><i>ϟ</i><span><b>${text('maps.default')}</b><small>${text('maps.defaultHint')}</small></span></button><button type="button" data-map-mode="random" aria-pressed="${lobby.mapId === 'random'}" ${!isHost ? 'disabled' : ''}><i>⇄</i><span><b>${text('maps.random')}</b><small>${text('maps.randomHint')}</small></span></button><button type="button" data-open-picker aria-haspopup="dialog" aria-pressed="${chooseActive}"><i>▦</i><span><b>${text('maps.choose')}</b><small>${text(isHost ? 'maps.chooseHint' : 'maps.browseHint', { count: STANDARD_MAPS.length })}</small></span><em>→</em></button></div><p id="map-feedback" class="map-feedback" role="status" aria-live="polite"></p>`;
  root.querySelector('.mode-panel').after(panel);
  panel.querySelectorAll('[data-map-mode]').forEach((button) => button.addEventListener('click', () => send({ type: 'map', mapId: button.dataset.mapMode })));
  panel.querySelector('[data-open-picker]').addEventListener('click', openPicker);
  if (activePicker?.open) renderPicker();
}

function openPicker() {
  if (activePicker?.open) return;
  filter = 'all';
  const dialog = document.createElement('dialog'); dialog.className = 'map-picker map-studio';
  dialog.setAttribute('aria-labelledby', 'map-picker-title');
  activePicker = dialog; document.body.append(dialog);
  dialog.addEventListener('close', () => { dialog.remove(); if (activePicker === dialog) activePicker = null; });
  renderPicker(); dialog.showModal();
}

function saveEditedMap(value) {
  if (!currentContext?.isHost || currentContext.lobby.gameMode !== GAME_MODES.SUPER) return 'maps.hostHelp';
  const saved = library();
  if (!value.localId && saved.length >= MAX_SAVED_MAPS) return 'maps.limit';
  const map = { ...value, localId: value.localId || crypto.randomUUID() };
  const index = saved.findIndex((entry) => entry.localId === map.localId);
  if (index >= 0) saved[index] = map; else saved.push(map);
  try { saveMapLibrary(saved); } catch { return 'maps.storageError'; }
  currentContext.send({ type: 'map', mapId: 'custom', customMap: map });
  activePicker?.close();
  return null;
}

function renderPicker() {
  if (!activePicker || !currentContext) return;
  const dialog = activePicker, { lobby, isHost, send } = currentContext;
  const scrollTop = dialog.querySelector('.picker-content')?.scrollTop || 0;
  const saved = library();
  const customMaps = [...saved];
  if (lobby.mapId === 'custom' && lobby.customMap && !saved.some((map) => sameCustom(map, lobby.customMap))) customMaps.unshift(lobby.customMap);
  const standard = STANDARD_MAPS.map((map) => ({ ...presetMap(map.id), ...map }));
  const all = [...standard, ...customMaps];
  const card = (map) => {
    const index = all.indexOf(map), custom = map.id === 'custom';
    const selected = custom ? lobby.mapId === 'custom' && sameCustom(map, lobby.customMap) : lobby.mapId === map.id;
    return `<article class="map-card ${selected ? 'selected' : ''}" style="--map-accent:${MAP_THEMES[map.theme].color}"><button type="button" class="map-select" data-map-choice="${index}" aria-pressed="${selected}" ${!isHost ? 'disabled' : ''}><div class="map-card-image"><canvas data-map-preview="${index}" aria-hidden="true"></canvas><span class="map-capacity">${text('maps.six')}</span>${selected ? `<b class="map-selected">✓ ${text('maps.selected')}</b>` : ''}</div><div class="map-card-copy"><strong>${custom ? escapeHtml(map.name) : text(map.nameKey, map.nameParams)}</strong><small>${text(custom ? 'maps.customDetail' : map.detailKey)}</small></div></button>${custom && isHost ? `<div class="map-card-tools"><button type="button" data-edit-map="${index}">${text('maps.edit')}</button>${map.localId ? `<button type="button" data-delete-map="${index}">${text('maps.delete')}</button>` : ''}</div>` : ''}</article>`;
  };
  const section = (title, maps) => `<section class="picker-family"><header><h3>${title}</h3><span>${maps.length}</span></header><div class="picker-map-grid">${maps.map(card).join('')}</div></section>`;
  let contents = '';
  if (filter === 'all') contents += section(text('maps.default'), standard.filter((map) => map.id === 'original'));
  for (const family of MAP_FAMILIES) {
    if (filter === 'all' || filter === family.id) contents += section(text(family.nameKey), standard.filter((map) => map.family === family.id));
  }
  if (filter === 'all' || filter === 'custom') contents += `<section class="picker-family"><header><h3>${text('maps.library')}</h3><small>${text('maps.localSave')}</small></header><div class="picker-map-grid">${customMaps.map(card).join('') || `<p class="map-empty">${text('maps.empty')}</p>`}</div></section>`;
  dialog.innerHTML = `<header class="studio-heading"><div><span class="map-kicker">${text('maps.collectionKicker')}</span><h2 id="map-picker-title">${text('maps.choose')}</h2><p>${text('maps.collectionHelp', { count: STANDARD_MAPS.length })}</p></div><button type="button" class="studio-close" data-close-picker ${attr('aria-label', 'maps.closePicker')}>✕</button></header><div class="picker-toolbar"><div class="picker-filters" role="group" ${attr('aria-label', 'maps.filter')}><button type="button" data-map-filter="all" aria-pressed="${filter === 'all'}">${text('maps.all')}</button>${MAP_FAMILIES.map((family) => `<button type="button" data-map-filter="${family.id}" aria-pressed="${filter === family.id}">${text(family.nameKey)}</button>`).join('')}<button type="button" data-map-filter="custom" aria-pressed="${filter === 'custom'}">${text('maps.library')}</button></div></div><div class="picker-content">${contents}</div><footer class="studio-footer"><p class="picker-feedback" role="status" aria-live="polite">${text(isHost ? 'maps.pickHelp' : 'maps.guestHelp')}</p>${isHost ? `<button type="button" class="map-create" data-create-map>＋ ${text('maps.create')}</button>` : ''}<button type="button" class="studio-cancel" data-close-picker>${text('maps.done')}</button></footer>`;
  dialog.querySelector('.picker-content').scrollTop = scrollTop;
  dialog.querySelectorAll('[data-map-preview]').forEach((canvas) => paintMapPreview(canvas, all[Number(canvas.dataset.mapPreview)]));
  dialog.querySelectorAll('[data-close-picker]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.querySelectorAll('[data-map-filter]').forEach((button) => button.addEventListener('click', () => { filter = button.dataset.mapFilter; renderPicker(); dialog.querySelector('.picker-content').scrollTop = 0; dialog.querySelector(`[data-map-filter="${filter}"]`).focus(); }));
  dialog.querySelectorAll('[data-map-choice]').forEach((button) => button.addEventListener('click', () => {
    const map = all[Number(button.dataset.mapChoice)];
    send({ type: 'map', mapId: map.id, ...(map.id === 'custom' ? { customMap: map } : {}) });
    dialog.close();
  }));
  dialog.querySelector('[data-create-map]')?.addEventListener('click', () => openEditor(null, saveEditedMap));
  dialog.querySelectorAll('[data-edit-map]').forEach((button) => button.addEventListener('click', () => openEditor(all[Number(button.dataset.editMap)], saveEditedMap)));
  dialog.querySelectorAll('[data-delete-map]').forEach((button) => button.addEventListener('click', () => {
    const map = all[Number(button.dataset.deleteMap)];
    try { saveMapLibrary(library().filter((entry) => entry.localId !== map.localId)); renderPicker(); }
    catch { showMapError('maps.storageError'); }
  }));
}
