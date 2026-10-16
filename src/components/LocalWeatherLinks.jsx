import { CloudSun, ExternalLink } from 'lucide-react';
import '../styles/local-weather.css';

const COPY = {
  hi: { title: 'अपने जिले की कृषि मौसम सलाह देखें', text: 'IMD पर राज्य और जिला चुनें। बुलेटिन की जारी तारीख, वैध अवधि और अपनी फसल की अवस्था मिलाएँ।', local: 'जिला बुलेटिन · स्थानीय भाषा', english: 'जिला बुलेटिन · English', state: 'राज्य की कृषि सलाह', note: 'ये आधिकारिक स्रोत के लिंक हैं। इस गाइड में आपके खेत का वर्तमान पूर्वानुमान नहीं दिखाया गया है।', external: 'नई टैब में खुलेगा' },
  mr: { title: 'आपल्या जिल्ह्याचा कृषी हवामान सल्ला पाहा', text: 'IMD वर राज्य आणि जिल्हा निवडा. बुलेटिनची तारीख, वैध कालावधी आणि आपल्या पिकाची अवस्था तपासा.', local: 'जिल्हा बुलेटिन · स्थानिक भाषा', english: 'जिल्हा बुलेटिन · English', state: 'राज्याचा कृषी सल्ला', note: 'हे अधिकृत स्रोतांचे दुवे आहेत. या मार्गदर्शिकेत आपल्या शेताचा सध्याचा हवामान अंदाज दाखवलेला नाही.', external: 'नवीन टॅबमध्ये उघडेल' },
  gu: { title: 'તમારા જિલ્લાની કૃષિ હવામાન સલાહ જુઓ', text: 'IMD પર રાજ્ય અને જિલ્લો પસંદ કરો. બુલેટિનની તારીખ, માન્ય સમયગાળો અને તમારા પાકની અવસ્થા તપાસો.', local: 'જિલ્લા બુલેટિન · સ્થાનિક ભાષા', english: 'જિલ્લા બુલેટિન · English', state: 'રાજ્યની કૃષિ સલાહ', note: 'આ સત્તાવાર સ્ત્રોતોની લિંક્સ છે. આ માર્ગદર્શિકામાં તમારા ખેતરનું વર્તમાન હવામાન અનુમાન દર્શાવેલું નથી.', external: 'નવી ટૅબમાં ખુલશે' },
};
const URLS = {
  local: 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_district_current_lo.php',
  english: 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_district_current_en.php',
  state: 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_state_current.php',
};

export default function LocalWeatherLinks({ language = 'hi' }) {
  const copy = COPY[language] || COPY.hi;
  return <section className="sb-local-weather" aria-label={copy.title} lang={language}>
    <div className="sb-local-weather__heading"><CloudSun size={25} aria-hidden="true" /><h2>{copy.title}</h2></div>
    <p>{copy.text}</p>
    <div className="sb-local-weather__links">{Object.entries(URLS).map(([key, href]) => <a key={key} href={href} target="_blank" rel="noopener noreferrer">{copy[key]}<ExternalLink size={14} aria-hidden="true" /><span className="sb-local-weather__sr"> ({copy.external})</span></a>)}</div>
    <small>{copy.note}</small>
  </section>;
}
