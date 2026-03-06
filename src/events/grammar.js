const FALLBACK_NAMES = ['Алфонсо','Родриго','Гильом','Генрих','Эдвард','Филипп','Бернар','Диего'];

function randomInt(max){
  if (!max || max < 1) return 0;
  if (window.crypto?.getRandomValues){
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function pickRandom(list){
  return list[randomInt(list.length)];
}

export function declineMaleName(name, grammaticalCase = 'nom'){
  if (grammaticalCase !== 'gen') return name;
  const n = name.trim();
  if (!n) return n;

  const lower = n.toLowerCase();
  if (lower.endsWith('й') || lower.endsWith('ь')) return `${n.slice(0, -1)}я`;
  if (lower.endsWith('а')) {
    const prev = lower.at(-2) || '';
    const soft = ['г','к','х','ж','ч','ш','щ'];
    return `${n.slice(0, -1)}${soft.includes(prev) ? 'и' : 'ы'}`;
  }
  if (lower.endsWith('я')) return `${n.slice(0, -1)}и`;
  const vowels = ['а','е','ё','и','о','у','ы','э','ю','я'];
  if (!vowels.includes(lower.at(-1))) return `${n}а`;
  return n;
}

export function injectName(faceText, namesPool, grammaticalCase){
  if (!faceText.includes('[имя]')) return faceText;
  const source = namesPool.length ? namesPool : FALLBACK_NAMES;
  const picked = pickRandom(source);
  const inflected = declineMaleName(picked, grammaticalCase || 'nom');
  return faceText.replaceAll('[имя]', inflected);
}

export function collectMaleNamesFromGenerator(data){
  if (!data || typeof data !== 'object') return [];
  const pools = ['spanish','french','german','english']
    .map((culture) => data[culture]?.names || [])
    .flat()
    .filter((name) => typeof name === 'string' && name.trim().length);
  return [...new Set(pools)];
}

const PREPOSITION_TO_CASE = {
  'у': 'gen',
  'из': 'gen',
  'от': 'gen',
  'с': 'gen',
  'без': 'gen',
  'для': 'gen',
  'возле': 'gen',
  'к': 'dat',
  'по': 'dat',
  'над': 'ins',
  'перед': 'ins',
  'между': 'ins',
  'в': 'pre'
};



const SPECIAL_OBJECT_FORMS = {
  'деревню': { gen:'деревни', dat:'деревне', pre:'деревне', ins:'деревней' },
  'лесную дорогу': { gen:'лесной дороги', dat:'лесной дороге', pre:'лесной дороге', ins:'лесной дорогой' },
  'мельницу': { gen:'мельницы', dat:'мельнице', pre:'мельнице', ins:'мельницей' },
  'шахту вилладиума': { gen:'шахты вилладиума', dat:'шахте вилладиума', pre:'шахте вилладиума', ins:'шахтой вилладиума' },
  'дорогую усадьбу': { gen:'дорогой усадьбы', dat:'дорогой усадьбе', pre:'дорогой усадьбе', ins:'дорогой усадьбой' },
  'рыбацкую деревню': { gen:'рыбацкой деревни', dat:'рыбацкой деревне', pre:'рыбацкой деревне', ins:'рыбацкой деревней' },
  'лесную вырубку': { gen:'лесной вырубки', dat:'лесной вырубке', pre:'лесной вырубке', ins:'лесной вырубкой' },
  'деревни провинции': { gen:'деревень провинции', dat:'деревням провинции', pre:'деревнях провинции', ins:'деревнями провинции' },
  'приграничные земли': { gen:'приграничных земель', dat:'приграничным землям', pre:'приграничных землях', ins:'приграничными землями' },
  'ремесленные мастерские': { gen:'ремесленных мастерских', dat:'ремесленным мастерским', pre:'ремесленных мастерских', ins:'ремесленными мастерскими' },
  'зерновые склады': { gen:'зерновых складов', dat:'зерновым складам', pre:'зерновых складах', ins:'зерновыми складами' },
  'поля провинции': { gen:'полей провинции', dat:'полям провинции', pre:'полях провинции', ins:'полями провинции' },
  'фермерские поселения': { gen:'фермерских поселений', dat:'фермерским поселениям', pre:'фермерских поселениях', ins:'фермерскими поселениями' },
  'лесные тропы': { gen:'лесных троп', dat:'лесным тропам', pre:'лесных тропах', ins:'лесными тропами' },
  'речные притоки': { gen:'речных притоков', dat:'речным притокам', pre:'речных притоках', ins:'речными притоками' },
  'охотничьи угодья': { gen:'охотничьих угодий', dat:'охотничьим угодьям', pre:'охотничьих угодьях', ins:'охотничьими угодьями' },
  'сельские колодцы': { gen:'сельских колодцев', dat:'сельским колодцам', pre:'сельских колодцах', ins:'сельскими колодцами' },
  'рыбацкие места': { gen:'рыбацких мест', dat:'рыбацким местам', pre:'рыбацких местах', ins:'рыбацкими местами' },
  'скотные пастбища': { gen:'скотных пастбищ', dat:'скотным пастбищам', pre:'скотных пастбищах', ins:'скотными пастбищами' },
  'лесные лагеря': { gen:'лесных лагерей', dat:'лесным лагерям', pre:'лесных лагерях', ins:'лесными лагерями' },
  'монастырские земли': { gen:'монастырских земель', dat:'монастырским землям', pre:'монастырских землях', ins:'монастырскими землями' },
  'пригородные поселения': { gen:'пригородных поселений', dat:'пригородным поселениям', pre:'пригородных поселениях', ins:'пригородными поселениями' },
  'городские ворота': { gen:'городских ворот', dat:'городским воротам', pre:'городских воротах', ins:'городскими воротами' }
};

function extractTrailingPreposition(phrase){
  if (!phrase) return '';
  const token = phrase.trim().split(/\s+/).at(-1) || '';
  return token.replace(/[.,!?;:]+$/g, '').toLowerCase();
}

function declineAdjective(word, grammaticalCase){
  const lower = word.toLowerCase();
  const map = {
    gen: [['ый', 'ого'], ['ой', 'ого'], ['ий', 'его'], ['ая', 'ой'], ['яя', 'ей'], ['ое', 'ого'], ['ее', 'его'], ['ую', 'ой'], ['юю', 'ей']],
    dat: [['ый', 'ому'], ['ой', 'ому'], ['ий', 'ему'], ['ая', 'ой'], ['яя', 'ей'], ['ое', 'ому'], ['ее', 'ему'], ['ую', 'ой'], ['юю', 'ей']],
    pre: [['ый', 'ом'], ['ой', 'ом'], ['ий', 'ем'], ['ая', 'ой'], ['яя', 'ей'], ['ое', 'ом'], ['ее', 'ем'], ['ую', 'ой'], ['юю', 'ей']],
    ins: [['ый', 'ым'], ['ой', 'ым'], ['ий', 'им'], ['ая', 'ой'], ['яя', 'ей'], ['ое', 'ым'], ['ее', 'им'], ['ую', 'ой'], ['юю', 'ей']]
  };

  const endings = map[grammaticalCase] || [];
  const pair = endings.find(([end]) => lower.endsWith(end));
  if (!pair) return word;
  return `${word.slice(0, -pair[0].length)}${pair[1]}`;
}

function declineNoun(word, grammaticalCase){
  const lower = word.toLowerCase();
  const last = lower.at(-1) || '';

  if (grammaticalCase === 'gen') {
    if (last === 'а') {
      const prev = lower.at(-2) || '';
      const soft = ['г', 'к', 'х', 'ж', 'ч', 'ш', 'щ'];
      return `${word.slice(0, -1)}${soft.includes(prev) ? 'и' : 'ы'}`;
    }
    if (last === 'я') return `${word.slice(0, -1)}и`;
    if (last === 'ь' || last === 'й') return `${word.slice(0, -1)}я`;
    if (last === 'о') return `${word.slice(0, -1)}а`;
    if (last === 'е') return `${word.slice(0, -1)}я`;
    if ('бвгджзклмнпрстфхцчшщ'.includes(last)) return `${word}а`;
    return word;
  }

  if (grammaticalCase === 'dat') {
    if (last === 'а' || last === 'я') return `${word.slice(0, -1)}е`;
    if (last === 'ь' || last === 'й') return `${word.slice(0, -1)}ю`;
    if (last === 'о') return `${word.slice(0, -1)}у`;
    if (last === 'е') return `${word.slice(0, -1)}ю`;
    if ('бвгджзклмнпрстфхцчшщ'.includes(last)) return `${word}у`;
    return word;
  }

  if (grammaticalCase === 'pre') {
    if (last === 'а' || last === 'я') return `${word.slice(0, -1)}е`;
    if (last === 'ь' || last === 'й') return `${word.slice(0, -1)}е`;
    if (last === 'о' || last === 'е') return `${word.slice(0, -1)}е`;
    if ('бвгджзклмнпрстфхцчшщ'.includes(last)) return `${word}е`;
    return word;
  }

  if (grammaticalCase === 'ins') {
    if (last === 'а') return `${word.slice(0, -1)}ой`;
    if (last === 'я') return `${word.slice(0, -1)}ей`;
    if (last === 'ь' || last === 'й') return `${word.slice(0, -1)}ем`;
    if (last === 'о') return `${word.slice(0, -1)}ом`;
    if (last === 'е') return `${word.slice(0, -1)}ем`;
    if ('бвгджзклмнпрстфхцчшщ'.includes(last)) return `${word}ом`;
    return word;
  }

  return word;
}

function declineObjectText(objectText, grammaticalCase){
  if (!grammaticalCase) return objectText;
  if (SPECIAL_OBJECT_FORMS[objectText]?.[grammaticalCase]) return SPECIAL_OBJECT_FORMS[objectText][grammaticalCase];
  const words = objectText.split(' ');
  if (words.length === 1) return declineNoun(words[0], grammaticalCase);

  return words
    .map((word, index) => (index === words.length - 1
      ? declineNoun(word, grammaticalCase)
      : declineAdjective(word, grammaticalCase)))
    .join(' ');
}

export function inflectObjectByAction(actionText, objectText){
  const preposition = extractTrailingPreposition(actionText);
  const grammaticalCase = PREPOSITION_TO_CASE[preposition];
  return declineObjectText(objectText, grammaticalCase);
}
