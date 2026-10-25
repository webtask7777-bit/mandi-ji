import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { mandiPath } from '../../shared/mandiPages';

// "अपनी मंडी खोजें": filters the state's mandi list and links to each mandi page.
export default function MandiSearch({ stateParam, stateNameHi }) {
  const [query, setQuery] = useState('');
  const { data } = useApi(`/mandis/directory?state=${encodeURIComponent(stateParam)}`);
  const mandis = Array.isArray(data) ? data : [];
  const needle = query.trim().toLowerCase();
  // Mandi-name matches first (names starting with the text before the rest), then district matches.
  const rank = row => { const name = row.name.toLowerCase(); return name.startsWith(needle) ? 0 : name.includes(needle) ? 1 : 2; };
  const matches = needle ? mandis.filter(row => `${row.name} ${row.district || ''}`.toLowerCase().includes(needle)).sort((a, b) => rank(a) - rank(b)).slice(0, 6) : [];
  return (
    <div className="sb-mandi-search">
      <label className="sb-mandi-search__field"><Search size={17} aria-hidden="true" /><span className="sr-only">{stateNameHi} में अपनी मंडी खोजें</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="अपनी मंडी खोजें (जैसे Raipur)" autoComplete="off" /></label>
      {needle && <ul className="sb-mandi-search__results" aria-label="मिली मंडियाँ">
        {matches.length ? matches.map(row => <li key={row.slug}><Link to={mandiPath(stateParam, row.slug)}><strong>{row.name} मंडी भाव</strong><small>{[row.district !== row.name ? row.district : null, row.topCrops.join(', ')].filter(Boolean).join(' · ')}</small></Link></li>)
          : <li className="sb-mandi-search__empty">{mandis.length ? 'इस नाम की मंडी नहीं मिली। अंग्रेज़ी नाम से खोजें।' : 'मंडियों की सूची लोड हो रही है…'}</li>}
      </ul>}
    </div>
  );
}
