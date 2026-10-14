import { BLOCK_COLORS, MAP_THEMES, STANDARD_MAPS, presetMap, protectedMapCells, validateCustomMap } from '../../shared/maps.js';
import { ARENA_TYPES, RECTANGLE_WIDTH as WIDTH, RECTANGLE_HEIGHT as HEIGHT, RECTANGLE_SPAWNS } from '../../shared/arena.js';
import { GAME_MODES, CRATE, WALL, EMPTY } from '../../shared/constants.js';
import { paintMapPreview } from '../map-art.js';
import { text, t, attr, setText } from '../i18n/index.js';
import { escapeHtml } from '../utils/html.js';
import '../map-studio.css';

let activeEditor = null;
export function closeMapEditor() { activeEditor?.close(); }

export function openEditor(existing, onSave) {
  closeMapEditor();
  let draft = existing ? { ...existing } : { ...presetMap('circuit'), name: t('maps.newName'), id: 'custom' };
  let tool = CRATE, color = 0, painting = false, lastCell = null;
  const undo = [], redo = [], protectedCells = protectedMapCells();
  const spawns = new Map(RECTANGLE_SPAWNS.map((spawn, index) => [spawn.y * WIDTH + spawn.x, index + 1]));
  const locked = (index) => protectedCells.has(index) || index % WIDTH === 0 || index % WIDTH === WIDTH - 1 || index < WIDTH || index >= WIDTH * (HEIGHT - 1);
  const dialog = document.createElement('dialog'); dialog.className = 'map-studio';
  dialog.setAttribute('aria-label', t('maps.studioTitle')); activeEditor = dialog;
  dialog.innerHTML = `<div class="studio-heading"><div><span class="map-kicker">${text('maps.studioKicker')}</span><h2>${text('maps.studioTitle')}</h2><p>${text('maps.studioSubtitle')}</p></div><button type="button" class="studio-close" ${attr('aria-label', 'maps.close')}>✕</button></div><div class="studio-body"><aside class="studio-controls"><label class="studio-label" for="map-name">${text('maps.name')}</label><input id="map-name" maxlength="32" value="${escapeHtml(draft.name)}" autocomplete="off" /><label class="studio-label" for="map-theme">${text('maps.theme')}</label><select id="map-theme">${Object.keys(MAP_THEMES).map((theme) => `<option value="${theme}" ${theme === draft.theme ? 'selected' : ''}>${escapeHtml(t(`maps.theme_${theme}`))}</option>`).join('')}</select><span class="studio-label">${text('maps.tools')}</span><div class="studio-tools" role="group" ${attr('aria-label', 'maps.tools')}><button type="button" data-tool="o" aria-pressed="true"><i>ϟ</i>${text('maps.crate')}</button><button type="button" data-tool="#" aria-pressed="false"><i>▣</i>${text('maps.wall')}</button><button type="button" data-tool="." aria-pressed="false"><i>◇</i>${text('maps.erase')}</button></div><span class="studio-label">${text('maps.colors')}</span><div class="studio-colors" role="group" ${attr('aria-label', 'maps.colors')}>${BLOCK_COLORS.map((value, index) => `<button type="button" data-color="${index}" style="--swatch:${value}" aria-pressed="${index === color}" ${attr('aria-label', `maps.color_${index}`)}><span>ϟ</span></button>`).join('')}</div><label class="studio-label" for="map-template">${text('maps.template')}</label><select id="map-template"><option value="">${escapeHtml(t('maps.chooseTemplate'))}</option>${STANDARD_MAPS.map((map) => `<option value="${map.id}">${escapeHtml(t(map.nameKey, map.nameParams))}</option>`).join('')}<option value="blank">${escapeHtml(t('maps.blank'))}</option></select><p class="studio-note">${text('maps.protected')}</p></aside><section class="studio-workspace"><div class="studio-board-heading"><span>23 × 15 <small>${text('maps.cells')}</small></span><span class="studio-player-badge">● ${text('maps.six')}</span></div><div class="studio-board"><canvas aria-hidden="true"></canvas><div class="studio-cells" role="group" ${attr('aria-label', 'maps.board')}>${Array.from({ length: WIDTH * HEIGHT }, (_, index) => `<button type="button" data-cell="${index}" ${locked(index) ? 'disabled' : ''} class="${spawns.has(index) ? 'spawn-cell' : ''}">${spawns.get(index) || ''}</button>`).join('')}</div></div><div class="studio-board-footer"><span>${text('maps.paintHelp')}</span><div><button type="button" id="map-undo">↶ ${text('maps.undo')}</button><button type="button" id="map-redo">↷ ${text('maps.redo')}</button></div></div><p class="studio-validation" role="status" aria-live="polite"></p></section></div><footer class="studio-footer"><p>${text('maps.saveHelp')}</p><button type="button" class="studio-cancel">${text('maps.cancel')}</button><button type="button" class="studio-save">${text('maps.save')} <span>→</span></button></footer>`;
  document.body.append(dialog);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const cells = [...dialog.querySelectorAll('[data-cell]')];
  const name = dialog.querySelector('#map-name');
  const feedback = dialog.querySelector('.studio-validation');
  const history = () => { undo.push({ grid: draft.grid, colors: draft.colors, theme: draft.theme }); if (undo.length > 80) undo.shift(); redo.length = 0; };
  const update = () => {
    paintMapPreview(dialog.querySelector('canvas'), draft, false);
    cells.forEach((cell, index) => {
      const tileKey = draft.grid[index] === WALL ? 'maps.wall' : draft.grid[index] === CRATE ? 'maps.crate' : 'maps.erase';
      cell.setAttribute('aria-label', spawns.has(index) ? t('maps.spawn', { number: spawns.get(index) }) : `${index % WIDTH + 1}, ${Math.floor(index / WIDTH) + 1}: ${t(tileKey)}`);
    });
    dialog.querySelector('#map-theme').value = draft.theme;
    dialog.querySelector('#map-undo').disabled = !undo.length;
    dialog.querySelector('#map-redo').disabled = !redo.length;
    const result = validateCustomMap({ ...draft, name: name.value });
    setText(feedback, result.error || 'maps.valid'); feedback.classList.toggle('invalid', Boolean(result.error));
  };
  const paint = (index) => {
    if (!Number.isInteger(index) || locked(index) || lastCell === index) return;
    lastCell = index;
    const tiles = [...draft.grid], colors = [...draft.colors];
    tiles[index] = tool; colors[index] = String(color);
    draft.grid = tiles.join(''); draft.colors = colors.join(''); update();
  };
  dialog.querySelector('.studio-cells').addEventListener('pointerdown', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (!cell || cell.disabled || event.button !== 0) return;
    event.preventDefault(); cell.focus(); history(); painting = true; lastCell = null; paint(Number(cell.dataset.cell));
  }, options);
  document.addEventListener('pointermove', (event) => {
    if (!painting) return;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-cell]');
    if (cell && dialog.contains(cell)) paint(Number(cell.dataset.cell));
  }, options);
  document.addEventListener('pointerup', () => { painting = false; lastCell = null; }, options);
  document.addEventListener('pointercancel', () => { painting = false; lastCell = null; }, options);
  dialog.querySelector('.studio-cells').addEventListener('click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (event.detail === 0 && cell && !cell.disabled) { history(); lastCell = null; paint(Number(cell.dataset.cell)); lastCell = null; }
  });
  dialog.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => {
    tool = button.dataset.tool;
    dialog.querySelectorAll('[data-tool]').forEach((entry) => entry.setAttribute('aria-pressed', String(entry === button)));
  }));
  dialog.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => {
    color = Number(button.dataset.color);
    dialog.querySelectorAll('[data-color]').forEach((entry) => entry.setAttribute('aria-pressed', String(entry === button)));
  }));
  name.addEventListener('input', update);
  dialog.querySelector('#map-theme').addEventListener('change', (event) => { history(); draft.theme = event.target.value; update(); });
  dialog.querySelector('#map-template').addEventListener('change', (event) => {
    const id = event.target.value; if (!id) return;
    history(); const template = presetMap(id === 'blank' ? 'original' : id);
    if (id === 'blank') template.grid = [...template.grid].map((tile, index) => locked(index) ? tile : EMPTY).join('');
    draft = { ...draft, grid: template.grid, colors: template.colors, theme: template.theme }; event.target.value = ''; update();
  });
  const restore = (from, to) => { if (!from.length) return; to.push({ grid: draft.grid, colors: draft.colors, theme: draft.theme }); Object.assign(draft, from.pop()); update(); };
  dialog.querySelector('#map-undo').addEventListener('click', () => restore(undo, redo));
  dialog.querySelector('#map-redo').addEventListener('click', () => restore(redo, undo));
  dialog.querySelector('.studio-save').addEventListener('click', () => {
    const result = validateCustomMap({ ...draft, name: name.value });
    const error = result.error || onSave({ ...result.map, ...(draft.localId ? { localId: draft.localId } : {}) });
    if (error) { setText(feedback, error); feedback.classList.add('invalid'); return; }
    dialog.close();
  });
  for (const button of dialog.querySelectorAll('.studio-close, .studio-cancel')) button.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { abort.abort(); dialog.remove(); if (activeEditor === dialog) activeEditor = null; });
  update(); dialog.showModal(); name.focus();
}
