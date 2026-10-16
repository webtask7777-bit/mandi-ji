// Explicit source IDs only. No substring guessing: a crop name can refer to
// seeds, leaves, fruit, split dal or processed goods with different appearances.
// These groups select clearly labelled CATEGORY artwork when exact artwork is
// unavailable. Ambiguous regional IDs stay generic until their identity is verified.
// Covers national/CG/state catalogs, tickers, price-detail records and existing aliases.
// beans and chilly-capsicum (identity not confirmed), sugarcane (raw cane is not a processed
// product), tobacco, rubber and tendu leaves (not fibre/fodder) use the neutral generic artwork.
export const CROP_IMAGE_CATEGORY_IDS = Object.freeze({
  grain: Object.freeze([
    "bajrapearl-millet-cumbu", "barleyjau", "barnyard", "basmati-rice", "broken-rice",
    "foxtail-milletnavane", "hybrid-cumbu", "jowar", "jowarsorghum", "kodo-milletvaragu", 
    "maize", "millets", "paddy", "paddybasmati", "paddycommon", "ragi", "ragifinger-millet", "rajgir",
    "rice", "same-savi", "t-v-cumbu", "wheat",
  ]),
  pulses: Object.freeze([
    "alasande-gram", "arhar", "arhar-daltur-dal", "arhartur-red-gramwhole", "avare-dal",
    "bengal-gram-dalchana-dal", "bengal-gramgramwhole", "big-gram", "black-gram-dalurd-dal",
    "black-gramurd-beanswhole", "chana", "chennangi-dal", "cowpealobia-karamani", "dal-mix",
    "field-pea", "gram", "green-gram-dalmoong-dal", "green-grammoongwhole",
    "kabuli-chanachickpeas-white", "karamani", "kulthihorse-gram", "lakteora", "lentilmasurwhole",
    "masoor", "masur-dal", "mataki", "moath-dal", "moong", "other-pulses", "peasdry", "red-gram",
    "red-gram-arhar-turwhole", "red-gram-split-arhar-dal-tur-dal", "redcowpea", "tivda", "urad",
    "white-peas",
  ]),
  fruit: Object.freeze([
    "walnut",
    "almondbadam", "amlanelli-kai", "apple", "apricotjardalu-khumani", "avocado", "bael", "banana",
    "berzizyphus-borehannu", "cashewnuts", "chakotha", "cherry", "chikoossapota", "coconut",
    "custard-applesharifa", "dates", "figanjura-anjeer", "galgallemon", "grapes", "guava",
    "jack-fruitripe", "jamunnarale-hannu", "karbujamusk-melon", "kinnow", "kiwi-fruit", "lemon", "lime",
    "litchi", "mango", "mangoraw-ripe", "mousambisweet-lime", "orange", "papaya", "passion-fruit",
    "peach", "pearmarasebu", "persimonjapani-fal", "pineapple", "plum", "pomegranate", "ramphal",
    "seetapal", "strawberry", "tamarind", "tamarind-fruit", "tender-coconut", "water-melon",
  ]),
  vegetable: Object.freeze([
    "amaranth", "amaranthus", "amranthas-red", "ash-gourd", "ashgourd", "asparagus", "baby-corn",
    "balekai", "bamboo-shoot", "banana-green", "beetroot", "bhindiladies-finger",
    "bitter-gourd", "bittergourd", "bottle-gourd", "bottlegourd", "brinjal", "bunch-beans", "cabbage",
    "capsicum", "carrot", "cauliflower", "chhappan-kaddu", "chow-chow",
    "cluster-beans", "clusterbean", "colacasia", "colocasia", "cowpeaveg", "cucumbarkheera", "cucumber",
    "drumstick", "eggplant", "elephant-yamsuran-amorphophallus", "french-beansfrasbean",
    "gram-rawchholia", "green-avarew", "green-banana", "green-peas", "indian-beansseam",
    "jackfruitgreen-raw-unripe", "kartalikantola", "knool-khol", "kundru", "ladies-finger",
    "lady-finger", "ladyfinger", "leafy-vegetable", "little-gourdkundru", "long-melonkakri",
    "lotus-sticks", "mashrooms", "methileaves", "mintpudina", "mushroom", "okra", "onion",
    "onion-green", "other-green-and-fresh-vegetables", "otherveg", "papayaraw", "parwal",
    "pea-pod-pea-cod", "peas-wet", "pegeon-peaarhar-fali", "pointed-gourdparval", "potato", "pumpkin",
    "raddish", "radish", "rat-tail-radishmogari", "ridge-gourdpermal-hybrid-gourd", "ridgegourd",
    "ridgeguardtori", "round-gourd", "snakeguard", "spinach", "spiny-gourd-kartalikantola",
    "sponge-gourd", "squashchappal-kadoo", "surat-beanspapadi", "suvarna-gadde", "sweet-corn",
    "sweet-potato", "sweet-pumpkin", "tapioca", "taro-arvi-stem", "tinda", "tomato",
    "turnip", "water-chestnut", "white-pumpkin", "wild-cucumber", "yam", "yamratalu",
  ]),
  spice: Object.freeze([
    "mace",
    "ajwan", "basil", "bay-leaftejpatta", "black-pepper", "cardamom", "cardamoms", "chili-red",
    "chilli", "cinamondalchini", "cloves", "coriander", "corianderleaves", "corriander-seed",
    "cummin-seedjeera", "dry-chillies", "fenugreek", "garlic", "ginger", "gingerdry", "gingergreen",
    "green-chilli", "greenchilli", "methi-seeds", "nigella", "nigella-seeds", "nutmeg",
    "pepper-garbled", "pepper-ungarbled", "poppy-seeds", "snow-mountain-garlic", "soanf", "sompu",
    "suvadill-seed", "turmeric", "turmericraw",
  ]),
  seed: Object.freeze([
    "ambrette-seed-muskmallow", "arecanutbetelnut-supari", "betelnuts", "castor-seed", "coconut-seed",
    "cotton-seed", "dhainchaseed", "flax-seeds", "ground-nut-seed", "groundnut", "groundnut-podsraw",
    "groundnutsplit", "guar-seedcluster-beans-seed", "honge-seed", "indian-colzasarson",
    "jackfruit-seed", "karanja-seeds", "linseed", "mahua-seedhippe-seed", "muskmelon-seeds", "mustard",
    "neem-seed", "niger-seedramtil", "safflower", "sesame", "sesamumsesame-gingelly-til", "soyabean",
    "soybean", "sunflower", "sunflower-seed", "sunflower-sunflower-seed", "tamarind-seed", "taramira",
  ]),
  herb: Object.freeze([
    "absinthe", "asgand", "ashwagandha", "behada", "betal-leaves", "bhui-amlaya", "brahmi",
    "chandrashoor", "chicorychikori-kasni", "giloy", "gond", "harrah", "isabgulpsyllium",
    "kalmegh", "mahedi", "mahua", "muleti", "soapnutantawala-retha", "stevia", "white-muesli",
  ]),
  processed: Object.freeze([
    "beaten-rice", "cocoa", "coffee", "copra", "dried-mango", "dry-grapes", "ghee", "gurjaggery",
    "khandsaridesi-khand", "maida-atta", "makhanafoxnut", "mango-powder", "rab-liquid-jaggery-molasses",
    "sabu-dan", "sugar", "wheat-atta",
  ]),
  oil: Object.freeze([
    "coconut-oil", "ground-nut-oil", "mentha-oil", "mustard-oil",
  ]),
  fibre: Object.freeze([
    "ambady-mesta-patson", "bamboo", "broomstickflower-broom", "coconut-coir", "cotton", "dhaincha",
    "dry-fodder", "firewood", "green-fodder", "jute", "lint", "rambansagave-century-plant",
    "sanai-sunhemp", "wood",
  ]),
  flower: Object.freeze([
    "anthorium", "astera", "carnation", "chrysanthemum", "chrysanthemumloose", "delha",
    "dhawai-flowers", "flowers-others", "gladiolus-cut-flower", "jarbara", "jasmine", "kankambra",
    "lilly", "lotus", "marget", "marigoldcalcutta", "marigoldloose", "orchid", "palash-flowers",
    "roselocal", "roseloose", "tube-flower", "tube-rosedouble", "tube-roseloose", "tube-rosesingle",
    "tulip",
  ]),
  livestock: Object.freeze([
    "bull", "calf", "cock", "cow", "duck", "egg", "goat", "he-buffalo", "hen", "ox", "pigs",
    "ram", "she-buffalo", "she-goat", "sheep",
  ]),
  seafood: Object.freeze([
    "fish", "prawn",
  ]),
  generic: Object.freeze([
    "coca", "jamamkhan", "macoy", "sanay",
    "beans", "chilly-capsicum", "rubber", "sugarcane", "tendu-leaves-kendu-leaves-bidi-leaves", "tobacco",
    "kutki", "muesli", "coleus", "asalia", "sweet-saag",
    "alsandikai", "bop", "bullar", "buttery", "chapparad-avare", "cowpea", "duster-beans",
    "field-beananumulu", "guar", "gulli", "jaee", "jaffri", "javi", "kakada", "patti-calcutta", "peas",
    "pupadia", "raibel", "raya", "rayee", "season-leaves", "seemebadnekai", "sem", "thogrikai",
    "thondekai", "vadang",
  ]),
});

export const CROP_IMAGE_CATEGORIES = Object.freeze(Object.fromEntries(
  Object.entries(CROP_IMAGE_CATEGORY_IDS).flatMap(([category, ids]) => ids.map(id => [id, category])),
));
