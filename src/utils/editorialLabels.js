export const EDITORIAL_LANGUAGES = { hi: 'हिन्दी', mr: 'मराठी', gu: 'ગુજરાતી' };

const labels = {
  hi: {
    locale: 'hi-IN', brand: 'सही भाव', guide: 'मार्गदर्शिका', guides: 'किसान मार्गदर्शिकाएँ', allGuides: 'सभी मार्गदर्शिकाएँ', allArticles: 'सभी लेख', article: 'लेख',
    market: 'मंडी भाव', delivery: 'डिलीवरी खर्च', home: 'सही भाव के मुख्य पृष्ठ पर जाएँ', navigation: 'मुख्य लिंक', skip: 'लेखों पर जाएँ',
    hero: 'खेती की तैयारी,', heroAccent: 'हर मौसम के साथ।', intro: 'अपनी फसल, राज्य और भाषा के अनुसार उपयोगी गाइड खोजें। स्रोत पढ़ें और स्थानीय सलाह से मिलाएँ।',
    regionFocus: 'अपने क्षेत्र के हिसाब से पढ़ें', regionHelp: 'राज्य के साथ सामान्य गाइड भी दिखेंगे। क्षेत्र की जानकारी हर लेख में दी गई है।',
    browse: 'अपनी ज़रूरत की गाइड खोजें', crop: 'फसल', allCrops: 'सभी फसलें', state: 'राज्य', allStates: 'सभी राज्य', language: 'भाषा', category: 'विषय', allCategories: 'सभी विषय',
    search: 'लेख खोजें', searchPlaceholder: 'जैसे धान, बारिश, ढुलाई…', apply: 'खोजें', reset: 'फ़िल्टर हटाएँ', result: 'लेख मिले', available: 'लेख उपलब्ध', featured: 'आपकी खोज से जुड़ी गाइड',
    readGuide: 'पूरी मार्गदर्शिका पढ़ें', read: 'लेख पढ़ें', libraryKicker: 'सवाल से समाधान तक', library: 'काम की किसान गाइड', loading: 'मार्गदर्शिकाएँ लोड हो रही हैं…',
    loadError: 'लेख अभी नहीं खुल पाए', errorHelp: 'कनेक्शन जाँचकर पृष्ठ दोबारा खोलें।', empty: 'इस चयन में कोई लेख नहीं मिला', emptyHelp: 'फसल, राज्य या विषय बदलें। इस भाषा में केवल उपलब्ध लेख दिखाए जाते हैं।',
    previous: 'पिछला पृष्ठ', next: 'अगला पृष्ठ', page: 'पृष्ठ', of: 'में से', pagination: 'लेखों के पृष्ठ', illustration: 'सांकेतिक चित्र', fallback: 'इस लेख का चित्र उपलब्ध नहीं है', minutes: 'मिनट', approx: 'लगभग',
    method: 'स्रोतों के साथ पढ़ें। स्थानीय सलाह से मिलाएँ।', methodHelp: 'वर्तमान मौसम चेतावनी, खेती का उपचार या सहायता की पात्रता के लिए लेख में दिए आधिकारिक स्रोत और स्थानीय कृषि सलाह जाँचें।', footer: 'जानकारी से बेहतर तैयारी',
    published: 'प्रकाशित', updated: 'संशोधित', editorial: 'आधिकारिक स्रोतों पर आधारित संपादकीय मार्गदर्शिका', region: 'क्षेत्र', changeLanguage: 'यह लेख दूसरी भाषा में पढ़ें',
    first: 'पहले ये समझें', takeaways: 'इस गाइड की मुख्य बातें', contents: 'इस लेख में', sourcesKicker: 'आगे जाँचने के लिए', sources: 'स्रोत और आधिकारिक जानकारी',
    sourcesHelp: 'अपने क्षेत्र की नवीनतम सूचना के लिए मूल स्रोत खोलें।', accessed: 'स्रोत देखा', newTab: 'नई टैब में खुलेगा', official: 'आधिकारिक स्रोत', tags: 'लेख के विषय',
    beforeMarket: 'मंडी जाने से पहले', transportHeading: 'ढुलाई का खर्च भी जोड़ें।', transportHelp: 'वाहन, दूरी और माल की मात्रा से बिक्री की तैयारी करें।', deliveryAction: 'डिलीवरी खर्च देखें',
    nextQuestion: 'अगला उपयोगी सवाल', related: 'साथ में ये भी पढ़ें', prices: 'इस फसल के मंडी भाव', pricesHelp: 'भाव की रिकॉर्ड तारीख और क्षेत्र देखकर तुलना करें।',
    articleLoading: 'लेख लोड हो रहा है', wait: 'कृपया कुछ पल रुकें।', missing: 'यह लेख नहीं मिला', missingHelp: 'यह लिंक बदल गया हो सकता है। सभी लेखों की सूची खोलें।', failed: 'लेख लोड नहीं हो पाया', retry: 'फिर कोशिश करें',
    caption: 'सांकेतिक AI चित्र; किसी वास्तविक घटना या वर्तमान मौसम का प्रमाण नहीं।',
  },
  mr: {
    locale: 'mr-IN', brand: 'सही भाव', guide: 'मार्गदर्शिका', guides: 'शेतकरी मार्गदर्शिका', allGuides: 'सर्व मार्गदर्शिका', allArticles: 'सर्व लेख', article: 'लेख',
    market: 'बाजारभाव', delivery: 'वाहतूक खर्च', home: 'सही भाव मुख्य पृष्ठावर जा', navigation: 'मुख्य दुवे', skip: 'लेखांकडे जा',
    hero: 'शेतीची तयारी,', heroAccent: 'प्रत्येक हंगामासोबत.', intro: 'आपले पीक, राज्य आणि भाषा यानुसार उपयोगी मार्गदर्शिका शोधा. मूळ स्रोत वाचा आणि स्थानिक सल्ल्याशी पडताळा.',
    regionFocus: 'आपल्या भागानुसार वाचा', regionHelp: 'राज्यासोबत सर्वसाधारण मार्गदर्शिकाही दिसतील. प्रत्येक लेखात लागू क्षेत्र दिले आहे.',
    browse: 'आपल्याला हवी असलेली मार्गदर्शिका शोधा', crop: 'पीक', allCrops: 'सर्व पिके', state: 'राज्य', allStates: 'सर्व राज्ये', language: 'भाषा', category: 'विषय', allCategories: 'सर्व विषय',
    search: 'लेख शोधा', searchPlaceholder: 'उदा. भात, पाऊस, वाहतूक…', apply: 'शोधा', reset: 'फिल्टर काढा', result: 'लेख सापडले', available: 'लेख उपलब्ध', featured: 'आपल्या शोधाशी संबंधित मार्गदर्शिका',
    readGuide: 'संपूर्ण मार्गदर्शिका वाचा', read: 'लेख वाचा', libraryKicker: 'प्रश्नापासून तयारीपर्यंत', library: 'उपयोगी शेतकरी मार्गदर्शिका', loading: 'मार्गदर्शिका लोड होत आहेत…',
    loadError: 'लेख उघडता आले नाहीत', errorHelp: 'इंटरनेट जोडणी तपासून पृष्ठ पुन्हा उघडा.', empty: 'या निवडीसाठी लेख सापडला नाही', emptyHelp: 'पीक, राज्य किंवा विषय बदला. या भाषेत उपलब्ध असलेलेच लेख दाखवले जातात.',
    previous: 'मागील पृष्ठ', next: 'पुढील पृष्ठ', page: 'पृष्ठ', of: 'पैकी', pagination: 'लेखांची पाने', illustration: 'प्रातिनिधिक चित्र', fallback: 'या लेखाचे चित्र उपलब्ध नाही', minutes: 'मिनिटे', approx: 'अंदाजे',
    method: 'मूळ स्रोत वाचा. स्थानिक सल्ल्याशी पडताळा.', methodHelp: 'सध्याचे हवामान इशारे, पिकावरील उपाय किंवा मदतीची पात्रता यांसाठी लेखातील अधिकृत स्रोत आणि स्थानिक कृषी सल्ला तपासा.', footer: 'माहितीतून चांगली तयारी',
    published: 'प्रकाशित', updated: 'अद्ययावत', editorial: 'अधिकृत स्रोतांवर आधारित संपादकीय मार्गदर्शिका', region: 'लागू क्षेत्र', changeLanguage: 'हा लेख दुसऱ्या भाषेत वाचा',
    first: 'आधी हे समजून घ्या', takeaways: 'या मार्गदर्शिकेतील मुख्य मुद्दे', contents: 'या लेखात', sourcesKicker: 'पुढील पडताळणीसाठी', sources: 'स्रोत आणि अधिकृत माहिती',
    sourcesHelp: 'आपल्या भागाची नवीनतम माहिती मिळवण्यासाठी मूळ स्रोत उघडा.', accessed: 'स्रोत पाहिला', newTab: 'नवीन टॅबमध्ये उघडेल', official: 'अधिकृत स्रोत', tags: 'लेखाचे विषय',
    beforeMarket: 'बाजारात जाण्यापूर्वी', transportHeading: 'वाहतूक खर्चही मोजा.', transportHelp: 'वाहन, अंतर आणि मालाचे प्रमाण लक्षात घेऊन विक्रीची तयारी करा.', deliveryAction: 'वाहतूक खर्च पाहा',
    nextQuestion: 'पुढील उपयोगी प्रश्न', related: 'हेही वाचा', prices: 'या पिकाचे बाजारभाव', pricesHelp: 'भाव नोंदवलेली तारीख आणि क्षेत्र पाहून तुलना करा.',
    articleLoading: 'लेख लोड होत आहे', wait: 'कृपया थोडे थांबा.', missing: 'हा लेख सापडला नाही', missingHelp: 'हा दुवा बदलला असू शकतो. सर्व लेखांची यादी उघडा.', failed: 'लेख लोड झाला नाही', retry: 'पुन्हा प्रयत्न करा',
    caption: 'प्रातिनिधिक AI चित्र; प्रत्यक्ष घटना किंवा सध्याच्या हवामानाचा पुरावा नाही.',
  },
  gu: {
    locale: 'gu-IN', brand: 'સહી ભાવ', guide: 'માર્ગદર્શિકા', guides: 'ખેડૂત માર્ગદર્શિકાઓ', allGuides: 'બધી માર્ગદર્શિકાઓ', allArticles: 'બધા લેખ', article: 'લેખ',
    market: 'મંડી ભાવ', delivery: 'પરિવહન ખર્ચ', home: 'સહી ભાવના મુખ્ય પૃષ્ઠ પર જાઓ', navigation: 'મુખ્ય લિંક્સ', skip: 'લેખ પર જાઓ',
    hero: 'ખેતીની તૈયારી,', heroAccent: 'દરેક મોસમ સાથે.', intro: 'તમારા પાક, રાજ્ય અને ભાષા પ્રમાણે ઉપયોગી માર્ગદર્શિકા શોધો. મૂળ સ્રોત વાંચો અને સ્થાનિક સલાહ સાથે સરખાવો.',
    regionFocus: 'તમારા વિસ્તાર પ્રમાણે વાંચો', regionHelp: 'રાજ્યની સાથે સામાન્ય માર્ગદર્શિકા પણ દેખાશે. દરેક લેખમાં લાગુ વિસ્તાર દર્શાવ્યો છે.',
    browse: 'તમને જરૂરી માર્ગદર્શિકા શોધો', crop: 'પાક', allCrops: 'બધા પાક', state: 'રાજ્ય', allStates: 'બધાં રાજ્યો', language: 'ભાષા', category: 'વિષય', allCategories: 'બધા વિષયો',
    search: 'લેખ શોધો', searchPlaceholder: 'જેમ કે ડાંગર, વરસાદ, પરિવહન…', apply: 'શોધો', reset: 'ફિલ્ટર દૂર કરો', result: 'લેખ મળ્યા', available: 'લેખ ઉપલબ્ધ', featured: 'તમારી શોધ સંબંધિત માર્ગદર્શિકા',
    readGuide: 'સંપૂર્ણ માર્ગદર્શિકા વાંચો', read: 'લેખ વાંચો', libraryKicker: 'પ્રશ્નથી તૈયારી સુધી', library: 'ઉપયોગી ખેડૂત માર્ગદર્શિકા', loading: 'માર્ગદર્શિકાઓ લોડ થઈ રહી છે…',
    loadError: 'લેખ ખોલી શકાયા નથી', errorHelp: 'ઇન્ટરનેટ જોડાણ તપાસીને પૃષ્ઠ ફરી ખોલો.', empty: 'આ પસંદગી માટે લેખ મળ્યો નથી', emptyHelp: 'પાક, રાજ્ય અથવા વિષય બદલો. આ ભાષામાં ઉપલબ્ધ લેખ જ દર્શાવાય છે.',
    previous: 'પાછલું પૃષ્ઠ', next: 'આગલું પૃષ્ઠ', page: 'પૃષ્ઠ', of: 'માંથી', pagination: 'લેખનાં પૃષ્ઠો', illustration: 'પ્રતીકાત્મક ચિત્ર', fallback: 'આ લેખનું ચિત્ર ઉપલબ્ધ નથી', minutes: 'મિનિટ', approx: 'અંદાજે',
    method: 'મૂળ સ્રોત વાંચો. સ્થાનિક સલાહ સાથે સરખાવો.', methodHelp: 'વર્તમાન હવામાન ચેતવણી, પાકની સારવાર અથવા સહાયની પાત્રતા માટે લેખના અધિકૃત સ્રોત અને સ્થાનિક કૃષિ સલાહ તપાસો.', footer: 'માહિતીથી સારી તૈયારી',
    published: 'પ્રકાશિત', updated: 'સુધારેલ', editorial: 'અધિકૃત સ્રોતો આધારિત સંપાદકીય માર્ગદર્શિકા', region: 'લાગુ વિસ્તાર', changeLanguage: 'આ લેખ બીજી ભાષામાં વાંચો',
    first: 'પહેલાં આ સમજો', takeaways: 'આ માર્ગદર્શિકાના મુખ્ય મુદ્દા', contents: 'આ લેખમાં', sourcesKicker: 'વધુ તપાસ માટે', sources: 'સ્રોત અને અધિકૃત માહિતી',
    sourcesHelp: 'તમારા વિસ્તારની નવીનતમ માહિતી માટે મૂળ સ્રોત ખોલો.', accessed: 'સ્રોત જોયો', newTab: 'નવા ટૅબમાં ખુલશે', official: 'અધિકૃત સ્રોત', tags: 'લેખના વિષયો',
    beforeMarket: 'મંડી જતાં પહેલાં', transportHeading: 'પરિવહન ખર્ચ પણ ગણો.', transportHelp: 'વાહન, અંતર અને માલના જથ્થા પ્રમાણે વેચાણની તૈયારી કરો.', deliveryAction: 'પરિવહન ખર્ચ જુઓ',
    nextQuestion: 'આગળનો ઉપયોગી પ્રશ્ન', related: 'આ પણ વાંચો', prices: 'આ પાકના મંડી ભાવ', pricesHelp: 'ભાવની નોંધની તારીખ અને વિસ્તાર જોઈને સરખામણી કરો.',
    articleLoading: 'લેખ લોડ થઈ રહ્યો છે', wait: 'કૃપા કરીને થોડી રાહ જુઓ.', missing: 'આ લેખ મળ્યો નથી', missingHelp: 'આ લિંક બદલાઈ હોઈ શકે છે. બધા લેખોની યાદી ખોલો.', failed: 'લેખ લોડ થયો નથી', retry: 'ફરી પ્રયાસ કરો',
    caption: 'પ્રતીકાત્મક AI ચિત્ર; કોઈ વાસ્તવિક ઘટના કે વર્તમાન હવામાનનો પુરાવો નથી.',
  },
};
export function getEditorialLabels(language = 'hi') { return labels[language] || labels.hi; }
export function editorialDate(value, language = 'hi') {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(getEditorialLabels(language).locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;
}
export function blogLanguagePath(language = 'hi') { return language === 'hi' ? '/blog' : `/blog?language=${encodeURIComponent(language)}`; }

const cropNames = {
  mr: { paddy: 'भात / तांदूळ', wheat: 'गहू', maize: 'मका', gram: 'हरभरा', mustard: 'मोहरी', soybean: 'सोयाबीन', cotton: 'कापूस', arhar: 'तूर', moong: 'मूग', urad: 'उडीद', masoor: 'मसूर', bajra: 'बाजरी', jowar: 'ज्वारी', sugarcane: 'ऊस', groundnut: 'भुईमूग', onion: 'कांदा', potato: 'बटाटा', tomato: 'टोमॅटो', garlic: 'लसूण', chilli: 'मिरची', grapes: 'द्राक्षे', banana: 'केळी', pomegranate: 'डाळिंब', mango: 'आंबा', okra: 'भेंडी', brinjal: 'वांगी', cauliflower: 'फुलकोबी', cabbage: 'कोबी' },
  gu: { paddy: 'ડાંગર / ચોખા', wheat: 'ઘઉં', maize: 'મકાઈ', gram: 'ચણા', mustard: 'રાયડો', soybean: 'સોયાબીન', cotton: 'કપાસ', arhar: 'તુવેર', moong: 'મગ', urad: 'અડદ', masoor: 'મસૂર', bajra: 'બાજરી', jowar: 'જુવાર', sugarcane: 'શેરડી', groundnut: 'મગફળી', onion: 'ડુંગળી', potato: 'બટાટા', tomato: 'ટામેટાં', garlic: 'લસણ', chilli: 'મરચાં', grapes: 'દ્રાક્ષ', banana: 'કેળાં', pomegranate: 'દાડમ', mango: 'કેરી', okra: 'ભીંડા', brinjal: 'રીંગણ', cauliflower: 'ફુલાવર', cabbage: 'કોબી' },
};
export function editorialCropName(id, fallback, language = 'hi') { return cropNames[language]?.[id] || fallback || id; }
export function editorialStateName(id, fallback, language = 'hi') {
  return ({ gu: { gujarat: 'ગુજરાત', maharashtra: 'મહારાષ્ટ્ર', chhattisgarh: 'છત્તીસગઢ', 'madhya-pradesh': 'મધ્ય પ્રદેશ', rajasthan: 'રાજસ્થાન', 'uttar-pradesh': 'ઉત્તર પ્રદેશ', bihar: 'બિહાર', punjab: 'પંજાબ', haryana: 'હરિયાણા' } })[language]?.[id] || fallback || id;
}
