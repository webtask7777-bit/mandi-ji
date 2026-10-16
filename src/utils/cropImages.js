import { CROP_IMAGE_CATEGORIES } from '../data/cropImageCategories.js';

// Explicit commodity IDs only. Never infer identity with substring matching:
// seeds, leaves, whole pulses, dal, fresh produce and processed products differ.
export const CROP_IMAGES = Object.freeze({
  paddy: 'paddy', paddycommon: 'paddy', paddybasmati: 'paddy',
  wheat: 'wheat', chana: 'chana', gram: 'chana', 'bengal-gramgramwhole': 'chana',
  maize: 'maize', mustard: 'mustard', eggplant: 'eggplant', brinjal: 'eggplant',
  carrot: 'carrot', cauliflower: 'cauliflower', cabbage: 'cabbage',
  'bottle-gourd': 'bottle-gourd', bottlegourd: 'bottle-gourd',
  okra: 'okra', 'ladies-finger': 'okra', 'lady-finger': 'okra',
  ladyfinger: 'okra', 'bhindiladies-finger': 'okra',
  banana: 'banana', ginger: 'ginger', gingergreen: 'ginger',
  cucumber: 'cucumber', cucumbarkheera: 'cucumber',
  corianderleaves: 'coriander',
  'bitter-gourd': 'bitter-gourd', bittergourd: 'bitter-gourd',
  'green-banana': 'green-banana', 'banana-green': 'green-banana',
  beetroot: 'beetroot', amaranth: 'amaranth', amaranthus: 'amaranth',
  'ash-gourd': 'ash-gourd', ashgourd: 'ash-gourd',
  coconut: 'coconut', capsicum: 'capsicum',
  'cluster-beans': 'cluster-beans', clusterbean: 'cluster-beans',
  garlic: 'garlic', apple: 'apple', drumstick: 'drumstick',
  'elephant-yamsuran-amorphophallus': 'elephant-yam', 'suvarna-gadde': 'elephant-yam',
  'arhartur-red-gramwhole': 'arhar-whole', arhar: 'arhar-whole', 'red-gram': 'arhar-whole',
  chikoossapota: 'chikoo', 'chow-chow': 'chayote', cotton: 'cotton',
  cowpeaveg: 'cowpea-pods',
  colacasia: 'colocasia', colocasia: 'colocasia',
  'bajrapearl-millet-cumbu': 'bajra', 'amlanelli-kai': 'amla',
  'black-gramurd-beanswhole': 'urad-whole', urad: 'urad-whole',
  'french-beansfrasbean': 'french-beans',
  'arecanutbetelnut-supari': 'arecanut', betelnuts: 'arecanut',
  'castor-seed': 'castor-seed', tomato: 'tomato', onion: 'onion', potato: 'potato',
  'green-chilli': 'green-chilli', greenchilli: 'green-chilli', lemon: 'lemon',
  pumpkin: 'pumpkin', spinach: 'spinach', mahua: 'mahua',
  'tamarind-fruit': 'tamarind', tamarind: 'tamarind',
  soybean: 'soybean', soyabean: 'soybean', radish: 'radish', raddish: 'radish',
  pomegranate: 'pomegranate', orange: 'orange', mango: 'mango',
  'green-peas': 'peas', 'peas-wet': 'peas', 'pea-pod-pea-cod': 'peas',
  groundnut: 'groundnut', 'green-grammoongwhole': 'moong-whole', moong: 'moong-whole',
  'lentilmasurwhole': 'masoor-whole', masoor: 'masoor-whole',
  'ragifinger-millet': 'ragi', ragi: 'ragi', 'jowarsorghum': 'jowar', jowar: 'jowar',
  'sesamumsesame-gingelly-til': 'sesame', sesame: 'sesame',
  'little-gourdkundru': 'ivy-gourd', kundru: 'ivy-gourd',
  'pointed-gourdparval': 'pointed-gourd', parwal: 'pointed-gourd',
  ridgeguardtori: 'ridge-gourd', ridgegourd: 'ridge-gourd',
  barnyard: 'barnyard-millet', linseed: 'linseed', 'flax-seeds': 'linseed',
  sunflower: 'sunflower-seed', 'sunflower-seed': 'sunflower-seed',
  // These are exact source commodities, including whole seeds and fruit forms.
  peach: 'peach', litchi: 'litchi', 'jamunnarale-hannu': 'jamun',
  'apricotjardalu-khumani': 'apricot', giloy: 'giloy',
  'methi-seeds': 'fenugreek-seed', soanf: 'fennel-seed', ajwan: 'ajwain',
  'tube-rosedouble': 'tuberose-double', chrysanthemumloose: 'chrysanthemum-loose',
  makhanafoxnut: 'makhana', 'chhappan-kaddu': 'summer-squash', 'squashchappal-kadoo': 'summer-squash',
  'berzizyphus-borehannu': 'ber', lakteora: 'grass-pea', tivda: 'grass-pea',
  behada: 'behada', 'neem-seed': 'neem-seed', rajgir: 'amaranth-grain',
  // The source names do not establish a specific flower/pulse identity.
  // These category illustrations must retain their explanatory notes.
  marget: 'flower-category', delha: 'flower-category', 'other-pulses': 'mixed-pulses',
  // New exact commodity artwork. Split dal, raw fruit and processed forms stay separate.
  papaya: 'papaya', papayaraw: 'raw-papaya', guava: 'guava',
  'mousambisweet-lime': 'sweet-lime', pineapple: 'pineapple', 'water-melon': 'watermelon',
  grapes: 'grapes', 'karbujamusk-melon': 'muskmelon',
  'custard-applesharifa': 'custard-apple', 'tender-coconut': 'tender-coconut',
  rice: 'rice', 'cummin-seedjeera': 'cumin-seed', 'corriander-seed': 'coriander-seed',
  // Dry peas are explicit; the source name Field Pea does not establish form.
  peasdry: 'field-pea',
  'barleyjau': 'barley', 'black-pepper': 'black-pepper',
  'arhar-daltur-dal': 'arhar-dal', 'red-gram-split-arhar-dal-tur-dal': 'arhar-dal',
  'black-gram-dalurd-dal': 'urad-dal', 'bengal-gram-dalchana-dal': 'chana-dal',
  'green-gram-dalmoong-dal': 'moong-dal', 'onion-green': 'spring-onion',
  'sweet-potato': 'sweet-potato', 'knool-khol': 'kohlrabi', snakeguard: 'snake-gourd',
  'betal-leaves': 'betel-leaf', mintpudina: 'mint', tapioca: 'tapioca',
  'dry-chillies': 'dry-chilli', gingerdry: 'dry-ginger',
  mashrooms: 'mushroom', mushroom: 'mushroom',
  // Exact source aliases with matching form; no regional-name guesses.
  'red-gram-arhar-turwhole': 'arhar-whole',
  'sunflower-sunflower-seed': 'sunflower-seed',
  'amranthas-red': 'amaranth',
  'ridge-gourdpermal-hybrid-gourd': 'ridge-gourd',
});

export const CROP_IMAGE_NOTES = Object.freeze({
  marget: 'फूल श्रेणी का प्रतीकात्मक चित्र; किस्म की पहचान की पुष्टि बाकी है।',
  delha: 'फूल श्रेणी का प्रतीकात्मक चित्र; किस्म की पहचान की पुष्टि बाकी है।',
  'other-pulses': 'दालों की श्रेणी का प्रतीकात्मक चित्र।',
});

const CATEGORY_LABELS = Object.freeze({
  grain: 'अनाज', pulses: 'दालों', fruit: 'फल और मेवे', vegetable: 'सब्ज़ियों',
  spice: 'मसाले', seed: 'बीज और तिलहन', herb: 'जड़ी-बूटी और वन उपज',
  processed: 'प्रसंस्कृत उत्पाद', oil: 'तेल', fibre: 'रेशे, लकड़ी और चारा',
  flower: 'फूल', livestock: 'पशु और पशु उत्पाद', seafood: 'मछली और जलीय उत्पाद',
});

const normalizeId = id => typeof id === 'string' ? id.trim().toLowerCase() : '';

// Also used after an exact image fails to load. Its description always explains
// that this is category artwork, never a photograph identifying the commodity.
export function getCropCategoryImage(id) {
  const key = normalizeId(id);
  const category = Object.hasOwn(CROP_IMAGE_CATEGORIES, key) ? CROP_IMAGE_CATEGORIES[key] : 'generic';
  const note = Object.hasOwn(CROP_IMAGE_NOTES, key) ? CROP_IMAGE_NOTES[key]
    : category === 'generic' ? 'कृषि उत्पाद का प्रतीकात्मक चित्र; फसल/उत्पाद की पहचान की पुष्टि बाकी है।'
      : `${CATEGORY_LABELS[category]} श्रेणी का प्रतीकात्मक चित्र; यह इस विशेष उत्पाद की तस्वीर नहीं है।`;
  return {
    src: category === 'flower' ? '/visuals/crop-flower-category.webp' : `/visuals/category-${category}.webp`,
    kind: 'category', category, note,
  };
}

export function getCropImage(id) {
  const key = normalizeId(id);
  const fallback = getCropCategoryImage(key);
  if (!Object.hasOwn(CROP_IMAGES, key)) return fallback;
  const isCategory = Object.hasOwn(CROP_IMAGE_NOTES, key);
  return {
    src: `/visuals/crop-${CROP_IMAGES[key]}.webp`,
    kind: isCategory ? 'category' : 'commodity',
    category: fallback.category,
    note: isCategory ? CROP_IMAGE_NOTES[key] : null,
  };
}

export function getCropImageSource(id) {
  return getCropImage(id).src;
}

export function getCropImageNote(id) {
  return getCropImage(id).note;
}
