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
  'elephant-yamsuran-amorphophallus': 'elephant-yam',
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
  makhanafoxnut: 'makhana', 'chhappan-kaddu': 'summer-squash',
  'berzizyphus-borehannu': 'ber', lakteora: 'grass-pea', tivda: 'grass-pea',
  behada: 'behada', 'neem-seed': 'neem-seed', rajgir: 'amaranth-grain',
  // The source names do not establish a specific flower/pulse identity.
  // These category illustrations must retain their explanatory notes.
  marget: 'flower-category', delha: 'flower-category', 'other-pulses': 'mixed-pulses',
});

export const CROP_IMAGE_NOTES = Object.freeze({
  marget: 'फूल श्रेणी का प्रतीकात्मक चित्र; किस्म की पहचान की पुष्टि बाकी है।',
  delha: 'फूल श्रेणी का प्रतीकात्मक चित्र; किस्म की पहचान की पुष्टि बाकी है।',
  'other-pulses': 'दालों की श्रेणी का प्रतीकात्मक चित्र।',
});

export function getCropImageSource(id) {
  const image = CROP_IMAGES[String(id || '').toLowerCase()];
  return typeof image === 'string' ? `/visuals/crop-${image}.webp` : null;
}

export function getCropImageNote(id) {
  const note = CROP_IMAGE_NOTES[String(id || '').toLowerCase()];
  return typeof note === 'string' ? note : null;
}
