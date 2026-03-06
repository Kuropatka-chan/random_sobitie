import { DATASETS, GENDER_LABELS } from './eventData.js';
import { collectMaleNamesFromGenerator, injectName, pickRandom } from './grammar.js';

const state = {
  namesPool: [],
  currentObjectIndexes: []
};

const $ = (id) => document.getElementById(id);

const datasetSelect = $('dataset');
const faceSelect = $('face');
const actionSelect = $('action');
const objectSelect = $('object');
const eventBox = $('eventBox');
const tagDataset = $('tagDataset');
const tagGender = $('tagGender');
const tagAction = $('tagAction');
const tagObjects = $('tagObjects');
const catalog = $('catalog');
const namesStatus = $('namesStatus');
const namesFile = $('namesFile');
const resultBox = $('resultBox');

const DECISIONS = {
  intervene: { label: 'вмешаться', modifier: 2 },
  ignore: { label: 'проигнорировать', modifier: -2 }
};

function setNamesStatus(text){
  namesStatus.textContent = text;
}

function fillSelect(selectEl, items){
  selectEl.innerHTML = '';
  items.forEach(({ value, text }) => {
    const opt = document.createElement('option');
    opt.value = String(value);
    opt.textContent = text;
    selectEl.appendChild(opt);
  });
}

function getCurrentDataset(){
  return DATASETS[datasetSelect.value];
}

function getCurrentFace(){
  return getCurrentDataset().faces[Number(faceSelect.value)];
}

function getCurrentAction(){
  return getCurrentDataset().actions[Number(actionSelect.value)];
}

function allowedObjectsIndexes(ds, action){
  return ds.objects
    .map((obj, index) => ({ obj, index }))
    .filter(({ obj }) => obj.tags.some((tag) => action.objectTags.includes(tag)))
    .map(({ index }) => index);
}

function refreshObjectSelect(keepCurrent = true){
  const ds = getCurrentDataset();
  const action = getCurrentAction();
  const allowedIndexes = allowedObjectsIndexes(ds, action);
  state.currentObjectIndexes = allowedIndexes;

  fillSelect(objectSelect, allowedIndexes.map((idx) => ({ value: idx, text: ds.objects[idx].text })));
  if (!allowedIndexes.length) {
    objectSelect.innerHTML = '<option value="">Нет совместимых объектов</option>';
    return;
  }

  if (keepCurrent && allowedIndexes.includes(Number(objectSelect.value))) {
    objectSelect.value = String(Number(objectSelect.value));
  } else {
    objectSelect.value = String(allowedIndexes[0]);
  }
}

function getActionForm(action, gender){
  return action.forms[gender] || action.forms.m;
}

function getReactionForm(action, gender){
  return action.reactionForms?.[gender] || action.reactionForms?.m;
}

function rollD20(){
  return Math.floor(Math.random() * 20) + 1;
}

function resolveDecision(decisionKey){
  const decision = DECISIONS[decisionKey];
  const ds = getCurrentDataset();
  const face = getCurrentFace();
  const action = getCurrentAction();
  const object = ds.objects[Number(objectSelect.value)];

  if (!decision || !object) {
    resultBox.textContent = 'Сначала выберите корректное событие.';
    return;
  }

  const renderedFace = injectName(face.text, state.namesPool, face.nameCase);
  const reactionForm = getReactionForm(action, face.gender);
  const roll = rollD20();
  const modifiedRoll = Math.min(20, Math.max(1, roll + decision.modifier));
  const isWin = modifiedRoll >= 11;

  if (!isWin) {
    resultBox.textContent = `Вы выбрали «${decision.label}». Бросок: ${roll} (${decision.modifier >= 0 ? '+' : ''}${decision.modifier}) = ${modifiedRoll}. Основатели не на вашей стороне...`;
    return;
  }

  if (!reactionForm) {
    resultBox.textContent = 'Для выбранного действия не задана реакция.';
    return;
  }

  resultBox.textContent = `Вы выбрали «${decision.label}». Бросок: ${roll} (${decision.modifier >= 0 ? '+' : ''}${decision.modifier}) = ${modifiedRoll}. ${renderedFace} ${reactionForm} ${object.text}.`;
}

function renderEvent(){
  const ds = getCurrentDataset();
  const face = getCurrentFace();
  const action = getCurrentAction();
  const object = ds.objects[Number(objectSelect.value)];

  if (!object) {
    eventBox.textContent = 'Нет допустимых комбинаций для выбранного действия.';
    return;
  }

  const renderedFace = injectName(face.text, state.namesPool, face.nameCase);
  const actionForm = getActionForm(action, face.gender);
  const eventText = `${renderedFace} ${actionForm} ${object.text}.`;

  eventBox.textContent = eventText;
  tagDataset.textContent = `Набор: ${ds.title}`;
  tagGender.textContent = `Род/число: ${GENDER_LABELS[face.gender]}`;
  tagAction.textContent = `Форма глагола: ${actionForm}`;
  tagObjects.textContent = `Семантика: ${action.objectTags.join(', ')}`;
}

function randomizeAll(){
  const ds = getCurrentDataset();
  faceSelect.value = String(Math.floor(Math.random() * ds.faces.length));
  actionSelect.value = String(Math.floor(Math.random() * ds.actions.length));
  refreshObjectSelect(false);
  const pick = pickRandom(state.currentObjectIndexes);
  objectSelect.value = String(pick);
  renderEvent();
  resultBox.textContent = 'После выбора действия здесь появится исход.';
}

function randomizeParts(){
  const ds = getCurrentDataset();
  if (Math.random() > 0.35) faceSelect.value = String(Math.floor(Math.random() * ds.faces.length));
  if (Math.random() > 0.2) actionSelect.value = String(Math.floor(Math.random() * ds.actions.length));
  refreshObjectSelect(false);
  if (Math.random() > 0.1) objectSelect.value = String(pickRandom(state.currentObjectIndexes));
  renderEvent();
  resultBox.textContent = 'После выбора действия здесь появится исход.';
}

async function copyEvent(){
  try {
    await navigator.clipboard.writeText(eventBox.textContent);
    const old = eventBox.textContent;
    eventBox.textContent = `${old} ✓`;
    setTimeout(() => { eventBox.textContent = old; }, 800);
  } catch {
    alert('Не удалось скопировать событие в буфер обмена.');
  }
}

function renderCatalog(datasetKey){
  const ds = DATASETS[datasetKey];
  catalog.innerHTML = '';
  const faceItems = ds.faces.map((f) => `${f.text} — ${GENDER_LABELS[f.gender]}`);
  const actionItems = ds.actions.map((a) => `${a.label} → [${a.objectTags.join(', ')}]`);
  const objectItems = ds.objects.map((o) => `${o.text} → [${o.tags.join(', ')}]`);

  [
    makeListBlock('Лица', faceItems),
    makeListBlock('Действия', actionItems),
    makeListBlock('Объекты', objectItems)
  ].forEach((block) => catalog.appendChild(block));
}

function makeListBlock(title, items){
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = title;
  const ul = document.createElement('ul');
  items.forEach((it) => {
    const li = document.createElement('li');
    li.textContent = it;
    ul.appendChild(li);
  });
  wrap.append(h, ul);
  return wrap;
}

function populateBaseSelectors(datasetKey){
  const ds = DATASETS[datasetKey];
  fillSelect(faceSelect, ds.faces.map((x, i) => ({ value:i, text:x.text })));
  fillSelect(actionSelect, ds.actions.map((x, i) => ({ value:i, text:x.label })));
  refreshObjectSelect(false);
}

async function tryLoadDefaultNamePool(){
  try {
    const res = await fetch('medieval_name_generator_ru_male_unique_v2.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const obj = await res.json();
    state.namesPool = collectMaleNamesFromGenerator(obj);
    setNamesStatus(`Имена загружены автоматически: ${state.namesPool.length}`);
  } catch {
    setNamesStatus('Автозагрузка имен недоступна (file://). Можно выбрать JSON вручную.');
  }
}

function initFilePicker(){
  namesFile.addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const txt = await file.text();
    try {
      const obj = JSON.parse(txt);
      state.namesPool = collectMaleNamesFromGenerator(obj);
      setNamesStatus(`Имена загружены из файла: ${state.namesPool.length}`);
      renderEvent();
    } catch {
      setNamesStatus('Ошибка JSON. Использую встроенный резервный список имен.');
    }
  });
}

function init(){
  Object.entries(DATASETS).forEach(([key, ds]) => {
    datasetSelect.add(new Option(ds.title, key));
  });

  datasetSelect.addEventListener('change', () => {
    populateBaseSelectors(datasetSelect.value);
    renderCatalog(datasetSelect.value);
    renderEvent();
  });

  faceSelect.addEventListener('change', renderEvent);
  actionSelect.addEventListener('change', () => {
    refreshObjectSelect(false);
    renderEvent();
    resultBox.textContent = 'После выбора действия здесь появится исход.';
  });
  objectSelect.addEventListener('change', () => {
    renderEvent();
    resultBox.textContent = 'После выбора действия здесь появится исход.';
  });

  $('randomAll').addEventListener('click', randomizeAll);
  $('randomParts').addEventListener('click', randomizeParts);
  $('copyEvent').addEventListener('click', copyEvent);
  $('interveneBtn').addEventListener('click', () => resolveDecision('intervene'));
  $('ignoreBtn').addEventListener('click', () => resolveDecision('ignore'));

  initFilePicker();

  datasetSelect.value = 'basic';
  populateBaseSelectors('basic');
  renderCatalog('basic');
  randomizeAll();
  tryLoadDefaultNamePool();
}

init();
