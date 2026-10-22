/**
 * Classify Kisan Call Centre (KCC) calls into crop + problem topics.
 *
 * The source has a free-text question, a crop name and a loose QueryType. QueryType is
 * often wrong for the question (a virus question filed as "Fertilizer Use"), so the
 * question text decides the problem when it names one; QueryType is only the fallback.
 * Patterns cover the English the call centres type and the Hindi most answers use.
 */

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

// kind: keet (insect), rog (disease), poshan (nutrition), kharpatwar (weeds), kheti (practice)
const PROBLEMS = [
  // Insects
  { id: 'stem-borer', hi: 'तना छेदक', kind: 'keet', re: /stem ?borer|shoot ?borer|dead ?heart|white ?ear|तना ?छेदक|तना ?बेधक|ਤਣੇ ਦੀ ਸੁੰਡੀ/i },
  { id: 'fruit-borer', hi: 'फल / फली छेदक', kind: 'keet', re: /fruit ?borer|pod ?borer|fruit and shoot|फल ?छेदक|फली ?छेदक|फल ?बेधक|helicoverpa|हेलिकोवर्पा/i },
  { id: 'fall-armyworm', hi: 'फॉल आर्मीवर्म', kind: 'keet', re: /fall ?army ?worm|\bfaw\b|फॉल ?आर्मी|फाल ?आर्मी/i },
  { id: 'armyworm', hi: 'सैनिक कीट / कटुआ इल्ली', kind: 'keet', re: /army ?worm|cut ?worm|कटुआ|सैनिक ?कीट|spodoptera|tobacco caterpillar/i },
  { id: 'pink-bollworm', hi: 'गुलाबी सुंडी', kind: 'keet', re: /pink ?boll ?worm|गुलाबी ?सु[ंन]डी|गुलाबी ?इल्ली|ਗੁਲਾਬੀ ਸੁੰਡੀ/i },
  { id: 'bollworm', hi: 'डेंडू छेदक (बॉलवर्म)', kind: 'keet', re: /boll ?worm|डेंडू/i },
  { id: 'leaf-folder', hi: 'पत्ती लपेटक', kind: 'keet', re: /leaf ?fold|leaf ?roll|पत्ती ?लपेटक|पत्ता ?लपेट/i },
  { id: 'plant-hopper', hi: 'भूरा माहू / फुदका', kind: 'keet', re: /plant ?hopper|\bbph\b|hopper burn|भूरा ?माहू|भूरा ?फुदका|फुदका/i },
  { id: 'gundhi-bug', hi: 'गंधी बग', kind: 'keet', re: /gundhi|ear ?head ?bug|rice ?bug|गंधी/i },
  { id: 'whitefly', hi: 'सफेद मक्खी', kind: 'keet', re: /white ?fly|सफ़?ेद ?मक्खी|ਚਿੱਟੀ ਮੱਖੀ/i },
  { id: 'aphid', hi: 'माहू / चेपा', kind: 'keet', re: /aphid|\bmahu\b|माहू|माहु|चेपा|ਤੇਲਾ/i },
  { id: 'jassid', hi: 'हरा फुदका (जैसिड)', kind: 'keet', re: /jassid|leaf ?hopper|हरा ?तेला|जैसिड/i },
  { id: 'thrips', hi: 'थ्रिप्स', kind: 'keet', re: /thrip|थ्रिप्स|थ्रिप/i },
  { id: 'mites', hi: 'माइट (मकड़ी)', kind: 'keet', re: /\bmites?\b|red spider|मकड़ी|माइट/i },
  { id: 'sucking-pests', hi: 'रस चूसक कीट', kind: 'keet', re: /sucking ?pest|रस ?चूस/i },
  { id: 'termite', hi: 'दीमक', kind: 'keet', re: /termite|दीमक|ਸਿਉਂਕ/i },
  { id: 'white-grub', hi: 'सफेद गिडार', kind: 'keet', re: /white ?grub|गिडार|गिंडार/i },
  { id: 'fruit-fly', hi: 'फल मक्खी', kind: 'keet', re: /fruit ?fly|फल ?मक्खी/i },
  { id: 'mealybug', hi: 'मिलीबग', kind: 'keet', re: /mealy ?bug|मिली ?बग/i },
  { id: 'hairy-caterpillar', hi: 'बालदार सुंडी', kind: 'keet', re: /hairy ?caterpillar|बालदार|कंबल ?कीड़ा/i },
  { id: 'rodents', hi: 'चूहे', kind: 'keet', re: /\brats?\b|rodent|चूहे|चूहा/i },
  { id: 'caterpillar', hi: 'इल्ली / सुंडी', kind: 'keet', re: /caterpillar|larva|इल्ली|सुंडी|ਸੁੰਡੀ/i },
  // Diseases
  { id: 'blast', hi: 'झोंका (ब्लास्ट) रोग', kind: 'rog', re: /\bblast\b|ब्लास्ट|झोंका|झुलसा ?\(ब्लास्ट/i },
  { id: 'sheath-blight', hi: 'शीथ ब्लाइट', kind: 'rog', re: /sheath ?blight|शीथ/i },
  { id: 'bacterial-blight', hi: 'जीवाणु झुलसा', kind: 'rog', re: /bacterial ?(leaf )?blight|\bblb\b|जीवाणु ?झुलसा/i },
  { id: 'blight', hi: 'झुलसा रोग (अगेती / पछेती)', kind: 'rog', re: /blight|झुलसा|ਝੁਲਸ/i },
  { id: 'false-smut', hi: 'कंडुआ (हल्दी रोग)', kind: 'rog', re: /false ?smut|कंडुआ|हल्दी ?रोग|loose ?smut|smut/i },
  { id: 'rust', hi: 'गेरुआ (रतुआ)', kind: 'rog', re: /\brust\b|गेरुआ|रतुआ|ਕੁੰਗੀ/i },
  { id: 'powdery-mildew', hi: 'चूर्णिल आसिता (सफेद चूर्ण)', kind: 'rog', re: /powdery ?mildew|चूर्णिल|भभूतिया/i },
  { id: 'downy-mildew', hi: 'मृदुरोमिल आसिता', kind: 'rog', re: /downy ?mildew|मृदुरोमिल|हरित ?बाली/i },
  { id: 'wilt', hi: 'उकठा (विल्ट)', kind: 'rog', re: /\bwilt|उकठा|उखेड़ा|विल्ट|मुरझान/i },
  { id: 'root-rot', hi: 'जड़ / तना गलन', kind: 'rog', re: /root ?rot|collar ?rot|stem ?rot|damping|जड़ ?गलन|जड़ ?सड़न|तना ?गलन|आर्द्र ?गलन/i },
  { id: 'leaf-curl', hi: 'पत्ती मरोड़ (लीफ कर्ल)', kind: 'rog', re: /leaf ?curl|पत्ती ?मरोड़|पत्ता ?मरोड़|कुकड़ा|चुरड़ा/i },
  { id: 'mosaic', hi: 'पीला मोज़ेक / वायरस', kind: 'rog', re: /mosaic|virus|viral|मोजेक|मोज़ेक|विषाणु|वायरस|ਵਾਇਰਸ/i },
  { id: 'leaf-spot', hi: 'पत्ती धब्बा', kind: 'rog', re: /leaf ?spot|tikka|cercospora|alternaria|anthracnose|पत्ती ?धब्बा|पत्तों ?पर ?धब्बे|धब्बा ?रोग|टिक्का/i },
  { id: 'fungal', hi: 'फफूंद रोग', kind: 'rog', re: /fung|फफूंद|फफूँद/i },
  // Nutrition and plant health
  { id: 'zinc', hi: 'जिंक की कमी (खैरा)', kind: 'poshan', re: /zinc|khaira|खैरा|जिंक|जस्ता/i },
  { id: 'yellowing', hi: 'पत्ती पीली पड़ना', kind: 'poshan', re: /yellow(ing)?|पीला(पन)?|पीली|ਪੀਲ/i },
  { id: 'flower-drop', hi: 'फूल / फल झड़ना', kind: 'poshan', re: /flower ?drop|fruit ?drop|flower ?shedding|फूल ?झड़|फल ?झड़|फूल ?गिर/i },
  { id: 'growth', hi: 'बढ़वार और फुटाव', kind: 'poshan', re: /growth|tiller|बढ़वार|बढ़ोतरी|कल्ले|फुटाव/i },
  { id: 'nutrients', hi: 'खाद और पोषण', kind: 'poshan', re: /nutrient|fertili[sz]er|\bdose\b|urea|\bdap\b|\bnpk\b|micronutrient|खाद|उर्वरक|यूरिया|पोषक|पोषण/i },
  // Weeds
  { id: 'weeds', hi: 'खरपतवार नियंत्रण', kind: 'kharpatwar', re: /weed|herbicide|खरपतवार|नींदा|ਨਦੀਨ/i },
  // Practices
  { id: 'variety', hi: 'उन्नत किस्म', kind: 'kheti', re: /variet|hybrid|किस्म|प्रजाति|वैरायटी/i },
  { id: 'seed-treatment', hi: 'बीज उपचार', kind: 'kheti', re: /seed ?treat|बीज ?उपचार|बीजोपचार/i },
  { id: 'sowing', hi: 'बुवाई का समय और तरीका', kind: 'kheti', re: /sowing|seed ?rate|spacing|nursery|transplant|बुवाई|बोवाई|रोपाई|नर्सरी|बीज ?दर/i },
  { id: 'irrigation', hi: 'सिंचाई', kind: 'kheti', re: /irrigat|water ?manage|सिंचाई|पानी ?कब/i },
  { id: 'harvest-storage', hi: 'कटाई और भंडारण', kind: 'kheti', re: /harvest|storage|post ?harvest|कटाई|भंडारण/i },
  // Fallback only: a plant-protection call that names no specific pest or disease.
  { id: 'pest-disease', hi: 'कीट-रोग नियंत्रण (सामान्य)', kind: 'keet', re: /(?!)/ },
];

const BY_ID = new Map(PROBLEMS.map(problem => [problem.id, problem]));

// QueryType (trimmed, lower-case) → query family. Families other than crop advice are counted
// for the "what farmers ask about" mix but never shown as crop problems.
const QUERY_FAMILIES = [
  ['weather', /weather/],
  ['market', /market|price/],
  ['scheme', /scheme|government|credit|loan|insurance|kcc|subsid|pm.?kisan|training|soil ?test|kisan ?credit/],
  ['animal', /animal|cattle|dairy|veterinar|fodder|feed|breeding|poultry|fish/],
  ['protection', /protection|pest|disease|insect|plant ?prot/],
  ['nutrient', /nutrient|fertili[sz]er|manure|bio-?fert/],
  ['weed', /weed/],
  ['variety', /variet|seed/],
  ['sowing', /sowing|cultural|field ?prep|nursery|time/],
  ['water', /water|irrigat/],
  ['harvest', /harvest|post|storage|preserv|processing/],
];

const FAMILY_FALLBACK_PROBLEM = { protection: 'pest-disease', nutrient: 'nutrients', weed: 'weeds', variety: 'variety', sowing: 'sowing', water: 'irrigation', harvest: 'harvest-storage' };
const FAMILY_HI = {
  crop: 'फसल की समस्या', weather: 'मौसम', market: 'मंडी भाव', scheme: 'योजना और कागज़', animal: 'पशुपालन', other: 'अन्य',
};

// Question text that names a scheme, the weather or a price outranks a mis-filed QueryType.
const TEXT_FAMILIES = [
  ['scheme', /pm ?kisan|samman ?nidhi|e-?kyc|yojn?a|scheme|insurance|fasal ?bima|kisan ?credit|\bkcc\b|subsidy|योजना|सम्मान ?निधि|बीमा|अनुदान/i],
  ['weather', /weather|rain ?fall|forecast|मौसम|बारिश|वर्षा की/i],
  ['market', /market ?price|mandi ?(rate|price|bhav)|price ?of|मंडी ?भाव|बाजार ?भाव/i],
];

function queryFamily(queryType, question) {
  for (const [family, re] of TEXT_FAMILIES) if (re.test(clean(question))) return family;
  const type = clean(queryType).toLowerCase();
  for (const [family, re] of QUERY_FAMILIES) if (re.test(type)) return family;
  const text = clean(question).toLowerCase();
  if (/weather|मौसम|बारिश/.test(text)) return 'weather';
  if (/price|rate|भाव|मंडी/.test(text)) return 'market';
  if (/scheme|yojana|kisan samman|योजना|सम्मान ?निधि|बीमा/.test(text)) return 'scheme';
  return 'other';
}

/** The problem a question names, or null. Specific names win over broad ones (order above). */
function problemFromText(text) {
  const value = clean(text);
  if (!value) return null;
  for (const problem of PROBLEMS) if (problem.re.test(value)) return problem;
  return null;
}

// KCC crop spellings → display crop. mandi is the price-page crop id where one exists.
const CROPS = [
  { id: 'paddy', hi: 'धान', mandi: 'paddycommon', re: /paddy|\bdhan\b|\brice\b/i },
  { id: 'wheat', hi: 'गेहूँ', mandi: 'wheat', re: /wheat/i },
  { id: 'maize', hi: 'मक्का', mandi: 'maize', re: /maize|makka|corn/i },
  { id: 'cotton', hi: 'कपास', mandi: 'cotton', re: /cotton|kapas/i },
  { id: 'soybean', hi: 'सोयाबीन', mandi: 'soyabean', re: /soy/i },
  { id: 'sugarcane', hi: 'गन्ना', mandi: null, re: /sugarcane|ganna/i },
  { id: 'mustard', hi: 'सरसों', mandi: 'mustard', re: /mustard|rapeseed|sarson|toria/i },
  { id: 'gram', hi: 'चना', mandi: 'bengal-gramgramwhole', re: /bengal ?gram|chick ?pea|^gram\b|chana/i },
  { id: 'arhar', hi: 'अरहर (तुअर)', mandi: 'arhartur-red-gramwhole', re: /red ?gram|arhar|tur\b|pigeon/i },
  { id: 'urad', hi: 'उड़द', mandi: 'black-gramurd-beanswhole', re: /black ?gram|urd|urad/i },
  { id: 'moong', hi: 'मूंग', mandi: 'green-grammoongwhole', re: /green ?gram|moong|mung ?bean/i },
  { id: 'groundnut', hi: 'मूँगफली', mandi: 'groundnut', re: /groundnut|peanut|mung ?phalli/i },
  { id: 'bajra', hi: 'बाजरा', mandi: 'bajrapearl-millet-cumbu', re: /bajra|pearl ?millet/i },
  { id: 'jowar', hi: 'ज्वार', mandi: 'jowarsorghum', re: /jowar|sorghum/i },
  { id: 'lentil', hi: 'मसूर', mandi: 'lentilmasurwhole', re: /lentil|masur/i },
  { id: 'pea', hi: 'मटर', mandi: 'green-peas', re: /\bpeas?\b/i },
  { id: 'sesame', hi: 'तिल', mandi: 'sesamumsesame-gingelly-til', re: /sesam|gingelly|\btil\b/i },
  { id: 'tomato', hi: 'टमाटर', mandi: 'tomato', re: /tomato/i },
  { id: 'potato', hi: 'आलू', mandi: 'potato', re: /potato/i },
  { id: 'onion', hi: 'प्याज', mandi: 'onion', re: /onion/i },
  { id: 'brinjal', hi: 'बैंगन', mandi: 'brinjal', re: /brinjal|egg ?plant|baingan/i },
  { id: 'chilli', hi: 'मिर्च', mandi: 'green-chilli', re: /chil+i|mirch/i },
  { id: 'okra', hi: 'भिंडी', mandi: 'bhindiladies-finger', re: /okra|bhindi|lad(y|ie)s ?finger/i },
  { id: 'cauliflower', hi: 'फूलगोभी', mandi: 'cauliflower', re: /cauliflower/i },
  { id: 'cabbage', hi: 'पत्तागोभी', mandi: 'cabbage', re: /cabbage/i },
  { id: 'cucurbits', hi: 'लौकी-करेला-कद्दू', mandi: null, re: /gourd|pumpkin|cucumber|melon|cucurbit/i },
  { id: 'garlic', hi: 'लहसुन', mandi: 'garlic', re: /garlic/i },
  { id: 'turmeric', hi: 'हल्दी', mandi: null, re: /turmeric/i },
  { id: 'ginger', hi: 'अदरक', mandi: 'gingergreen', re: /ginger/i },
  { id: 'banana', hi: 'केला', mandi: 'banana', re: /banana/i },
  { id: 'mango', hi: 'आम', mandi: 'mango', re: /mango/i },
  { id: 'coconut', hi: 'नारियल', mandi: 'coconut', re: /coconut/i },
  { id: 'citrus', hi: 'नींबू-संतरा', mandi: 'lemon', re: /citrus|lemon|lime|orange|mosambi|kinnow/i },
  { id: 'pomegranate', hi: 'अनार', mandi: 'pomegranate', re: /pomegranate/i },
  { id: 'guava', hi: 'अमरूद', mandi: 'guava', re: /guava/i },
  { id: 'papaya', hi: 'पपीता', mandi: 'papaya', re: /papaya/i },
  { id: 'arecanut', hi: 'सुपारी', mandi: 'arecanutbetelnut-supari', re: /areca/i },
  { id: 'cumin', hi: 'जीरा', mandi: 'cummin-seedjeera', re: /cumin|cummin|jeera/i },
  { id: 'coriander', hi: 'धनिया', mandi: 'corianderleaves', re: /coriander|dhania/i },
  { id: 'fenugreek', hi: 'मेथी', mandi: 'methileaves', re: /fenugreek|methi/i },
  { id: 'linseed', hi: 'अलसी', mandi: null, re: /linseed|alsi/i },
  { id: 'isabgol', hi: 'इसबगोल', mandi: null, re: /isabgo?u?l|psyllium/i },
  { id: 'sunflower', hi: 'सूरजमुखी', mandi: null, re: /sunflower/i },
  { id: 'castor', hi: 'अरंडी', mandi: 'castor-seed', re: /castor/i },
  { id: 'barley', hi: 'जौ', mandi: 'barleyjau', re: /barley/i },
  { id: 'ragi', hi: 'रागी (मंडुआ)', mandi: null, re: /ragi|finger ?millet/i },
  { id: 'cowpea', hi: 'लोबिया', mandi: 'cowpeaveg', re: /cowpea|lobia/i },
  { id: 'spinach', hi: 'पालक', mandi: 'spinach', re: /spinach|palak/i },
  { id: 'radish', hi: 'मूली', mandi: 'raddish', re: /radish/i },
  { id: 'carrot', hi: 'गाजर', mandi: 'carrot', re: /carrot/i },
  { id: 'capsicum', hi: 'शिमला मिर्च', mandi: 'capsicum', re: /capsicum/i },
  { id: 'beans', hi: 'सेम / बीन्स', mandi: 'beans', re: /\bbeans?\b|french ?bean/i },
  { id: 'grapes', hi: 'अंगूर', mandi: 'grapes', re: /grape/i },
  { id: 'apple', hi: 'सेब', mandi: 'apple', re: /apple/i },
  { id: 'jute', hi: 'जूट (पटसन)', mandi: null, re: /jute/i },
  { id: 'tea', hi: 'चाय', mandi: null, re: /^tea\b/i },
  { id: 'coffee', hi: 'कॉफी', mandi: null, re: /coffee/i },
  { id: 'black-pepper', hi: 'काली मिर्च', mandi: 'black-pepper', re: /black ?pepper/i },
  { id: 'cardamom', hi: 'इलायची', mandi: null, re: /cardamom/i },
  { id: 'rubber', hi: 'रबर', mandi: null, re: /rubber/i },
  { id: 'tobacco', hi: 'तंबाकू', mandi: null, re: /tobacco/i },
];
const CROP_BY_ID = new Map(CROPS.map(crop => [crop.id, crop]));
const titleCase = value => clean(value).toLowerCase().replace(/(^|[\s(/-])\p{L}/gu, match => match.toUpperCase());

/** KCC crop → display crop, or null for "Others", animals and blanks. */
function cropOf(name, question = '') {
  const value = clean(name);
  if (!value || /^(others?|na|n\/a|-)$/i.test(value)) {
    // "Others" with a named crop in the question ("weed management in onion").
    const text = clean(question);
    if (text) for (const crop of CROPS) if (crop.re.test(` ${text} `.replace(/^\s+/, ''))) return crop;
    return null;
  }
  for (const crop of CROPS) if (crop.re.test(value)) return crop;
  const slug = value.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? { id: slug, hi: titleCase(value.replace(/\(.*?\)/g, '')), mandi: null } : null;
}

/** One call → { family, crop, problem } where crop/problem are set only for crop advice. */
function classify(row) {
  const family = queryFamily(row.qt, row.q);
  if (['weather', 'market', 'scheme', 'animal'].includes(family)) return { family };
  const crop = cropOf(row.c, row.q);
  const problem = problemFromText(row.q) || BY_ID.get(FAMILY_FALLBACK_PROBLEM[family]) || null;
  if (!crop || !problem) return { family: family === 'other' && !crop ? 'other' : 'crop', crop, problem: null };
  return { family: 'crop', crop, problem };
}

const topicKey = (cropId, problemId) => `${cropId}~${problemId}`;

module.exports = { PROBLEMS, BY_ID, CROPS, CROP_BY_ID, FAMILY_HI, queryFamily, problemFromText, cropOf, classify, topicKey, clean };
