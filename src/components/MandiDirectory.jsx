import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { mandiPath } from '../../shared/mandiPages';

const VISIBLE = 40;

// Crawlable links to the state's indexable mandi pages. Thin (noindex) mandi pages stay
// reachable through the mandi search instead of being advertised here.
export default function MandiDirectory({ stateParam, stateNameHi }) {
  const { data } = useApi(`/mandis/directory?state=${encodeURIComponent(stateParam)}`);
  const mandis = Array.isArray(data) ? data.filter(row => row.indexable !== false) : [];
  if (!mandis.length) return null;
  const link = row => <Link key={row.slug} to={mandiPath(stateParam, row.slug)}>{row.name}</Link>;
  return (
    <nav className="sb-crop-directory" aria-label={`${stateNameHi} की मंडियों के भाव`}>
      <h2>{stateNameHi} की मंडियों के भाव</h2>
      <div className="sb-crop-directory-links">{mandis.slice(0, VISIBLE).map(link)}</div>
      {mandis.length > VISIBLE && <details className="sb-mandi-directory-more"><summary>सभी {mandis.length.toLocaleString('en-IN')} मंडियाँ देखें</summary><div className="sb-crop-directory-links">{mandis.slice(VISIBLE).map(link)}</div></details>}
    </nav>
  );
}
