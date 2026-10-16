import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus, Info, Search, Sprout } from "lucide-react";
import CropImage from "./CropImage";

const number = value => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function TickerBoard({ data, onSelectCrop, selectedCrop }) {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState("records");
  const [search, setSearch] = useState('');
  if (!Array.isArray(data) || data.length === 0) return <div className="sb-price-empty"><Sprout size={28} aria-hidden="true" /><h3>इस राज्य का भाव बोर्ड अभी खाली है</h3><p>दूसरा राज्य चुनकर उपलब्ध फसल रिकॉर्ड देखें।</p></div>;

  const sorted = data.filter(item => `${item.nameHi || ''} ${item.name || ''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => {
    if (sortBy === "price") return b.price - a.price;
    if (sortBy === "change") return Math.abs(b.changePct || 0) - Math.abs(a.changePct || 0);
    if (sortBy === "coverage") return (b.mandiCount || 0) - (a.mandiCount || 0);
    return (b.records || 0) - (a.records || 0);
  });
  const visible = expanded ? sorted : sorted.slice(0, 10);

  return (
    <section className="sb-board" aria-labelledby="sb-board-title">
      <div className="sb-section-heading">
        <div><p className="sb-eyebrow">एक नज़र में बाज़ार</p><h2 id="sb-board-title">फसलों का भाव बोर्ड</h2></div>
        <label className="sb-sort-label">क्रम
          <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
            <option value="records">अधिक रिकॉर्ड</option><option value="price">अधिक भाव</option>
            <option value="change">अधिक बदलाव</option><option value="coverage">अधिक मंडियाँ</option>
          </select>
        </label>
      </div>
      <div className="sb-board-tools"><label className="sb-crop-search"><Search size={18} aria-hidden="true" /><span className="sr-only">भाव बोर्ड में फसल खोजें</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setExpanded(false); }} placeholder="बोर्ड में फसल खोजें…" /></label><p>अंतिम दर्ज महीने का औसत · ₹ / क्विंटल</p></div>
      <div className="sb-board__table-wrap" tabIndex={0} role="region" aria-label="फसल भाव तालिका, छोटे पर्दे पर दाएँ-बाएँ स्क्रॉल करें">
        <table className="sb-board__table">
          <caption className="sr-only">अंतिम उपलब्ध महीने का औसत भाव, पिछले दर्ज महीने से बदलाव और रिकॉर्ड की संख्या। यह आज की खरीद या बिक्री की सलाह नहीं है।</caption>
          <thead><tr><th scope="col">फसल / मंडियाँ</th><th scope="col">मासिक औसत</th><th scope="col">पिछले दर्ज महीने से</th><th scope="col">कुल रिकॉर्ड</th></tr></thead>
          <tbody>{visible.map(item => {
            const changeKnown = Number(item.prevPrice) > 0 && item.changePct != null && Number.isFinite(Number(item.changePct));
            const change = Number(item.changePct);
            const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
            const isSelected = selectedCrop === item.id;
            return <tr key={item.id} className={isSelected ? "sb-board__row--selected" : ""}>
              <th scope="row"><button type="button" className="sb-board__crop" onClick={() => onSelectCrop?.(item.id)} aria-pressed={isSelected}>
                <CropImage id={item.id} name={item.nameHi || item.name} size="sm" />
                <span><strong>{item.nameHi || item.name}</strong><small>{item.mandiCount ? `${number(item.mandiCount)} मंडियाँ` : "रिकॉर्ड उपलब्ध"}</small></span>
              </button></th>
              <td><strong className="sb-board__price">{Number(item.price) > 0 ? `₹${number(item.price)}` : "—"}</strong>{Number(item.msp) > 0 && <small>MSP{item.mspSeason ? ` ${item.mspSeason}` : ''} ₹{number(item.msp)}</small>}</td>
              <td><span className={`sb-change ${change > 0 ? "sb-change--up" : change < 0 ? "sb-change--down" : "sb-change--flat"}`}>
                {changeKnown ? <><ChangeIcon size={15} aria-hidden="true" />{change > 0 ? "+" : ""}{change}%</> : "—"}
              </span></td>
              <td><span className="sb-board__records">{Number(item.records) > 0 ? number(item.records) : '—'}</span></td>
            </tr>;
          })}</tbody>
        </table>
        {!sorted.length && <p className="sb-empty-copy">इस नाम की फसल नहीं मिली। हिंदी या अंग्रेज़ी में खोजें।</p>}
      </div>
      {sorted.length > 10 && <button type="button" className="sb-more-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        {expanded ? <><ChevronUp size={17} />कम दिखाएँ</> : <><ChevronDown size={17} />सभी {sorted.length} फसलें देखें</>}
      </button>}
      <p className="sb-data-note"><Info size={15} aria-hidden="true" />बोर्ड में मासिक औसत हैं; इन्हें आज का भाव न मानें। फसल खोलकर उपलब्ध तारीख और मंडी का विवरण देखें। रिकॉर्ड की संख्या कारोबार की मात्रा नहीं है।</p>
    </section>
  );
}
