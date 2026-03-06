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
