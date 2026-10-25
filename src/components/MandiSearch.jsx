import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { mandiPath } from '../../shared/mandiPages';
import { mandiDisplayName, mandiSearchText } from '../../shared/mandiNames';

// "अपनी मंडी खोजें": filters the state's mandi list and links to each mandi page.
export default function MandiSearch({ stateParam, stateNameHi }) {
  const [query, setQuery] = useState('');
  const { data, loading, error } = useApi(`/mandis/directory?state=${encodeURIComponent(stateParam)}`);
  const mandis = Array.isArray(data) ? data : [];
  const needle = query.trim().toLowerCase();
  // Mandi-name matches first (names starting with the text before the rest), then district matches.
  const rank = row => { const names = [row.name.toLowerCase(), mandiDisplayName(row.name, stateParam).toLowerCase()]; return names.some(name => name.startsWith(needle)) ? 0 : names.some(name => name.includes(needle)) ? 1 : 2; };
  const matches = needle ? mandis.filter(row => mandiSearchText(row, stateParam).includes(needle)).sort((a, b) => rank(a) - rank(b)).slice(0, 6) : [];
  return (
    <div className="sb-mandi-search">
      <label className="sb-mandi-search__field"><Search size={17} aria-hidden="true" /><span className="sr-only">{stateNameHi} में अपनी मंडी खोजें</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={stateParam === 'chhattisgarh' ? 'अपनी मंडी खोजें · रायपुर / Raipur' : 'मंडी या ज़िला खोजें (स्रोत का नाम)'} autoComplete="off" /></label>
      {needle && <ul className="sb-mandi-search__results" aria-label="मिली मंडियाँ">
        {matches.length ? matches.map(row => <li key={row.slug}><Link to={mandiPath(stateParam, row.slug)}><strong>{mandiDisplayName(row.name, stateParam)} मंडी भाव</strong><small>{[mandiDisplayName(row.name, stateParam) !== row.name ? row.name : null, row.district !== row.name ? row.district : null, (row.topCrops || []).join(', ')].filter(Boolean).join(' · ')}</small></Link></li>)
          : <li className="sb-mandi-search__empty" role="status">{loading ? 'मंडियों की सूची लोड हो रही है…' : error ? 'मंडी सूची लोड नहीं हुई। पृष्ठ दोबारा खोलें।' : 'इस नाम की मंडी नहीं मिली। दूसरा नाम या ज़िला खोजें।'}</li>}
      </ul>}
    </div>
  );
}
