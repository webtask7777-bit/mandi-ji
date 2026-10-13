import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus, Info } from "lucide-react";
import CropImage from "./CropImage";

const SIGNALS = {
  sell: { className: "sb-signal--sell", label: "बिक्री संकेत" },
  buy: { className: "sb-signal--buy", label: "खरीद संकेत" },
  hold: { className: "sb-signal--hold", label: "प्रतीक्षा संकेत" },
};
const number = value => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function TickerBoard({ data, onSelectCrop, selectedCrop }) {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState("records");
  if (!Array.isArray(data) || data.length === 0) return null;

  const sorted = [...data].sort((a, b) => {
    if (sortBy === "price") return b.price - a.price;
    if (sortBy === "change") return Math.abs(b.changePct) - Math.abs(a.changePct);
    if (sortBy === "signal") {
      const order = { sell: 0, buy: 1, hold: 2 };
      return (order[a.signal] ?? 2) - (order[b.signal] ?? 2);
    }
    return b.records - a.records;
  });
  const visible = expanded ? sorted : sorted.slice(0, 10);

  return (
    <section className="sb-board" aria-labelledby="sb-board-title">
      <div className="sb-section-heading">
        <div><p className="sb-eyebrow">एक नज़र में बाज़ार</p><h2 id="sb-board-title">फसलों का भाव बोर्ड</h2></div>
        <label className="sb-sort-label">क्रम
          <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
            <option value="records">अधिक रिकॉर्ड</option><option value="price">अधिक भाव</option>
            <option value="change">अधिक बदलाव</option><option value="signal">संकेत</option>
          </select>
        </label>
      </div>
      <div className="sb-board__table-wrap">
        <table className="sb-board__table">
          <caption className="sr-only">उपलब्ध रिकॉर्ड से फसल, थोक भाव, बदलाव और अनुमानित संकेत। फसल के नाम से उसका विवरण खोलें।</caption>
          <thead><tr><th scope="col">फसल / मंडियाँ</th><th scope="col">भाव · ₹/क्विंटल</th><th scope="col">बदलाव</th><th scope="col">अनुमानित संकेत</th></tr></thead>
          <tbody>{visible.map(item => {
            const changeKnown = item.changePct != null && Number.isFinite(Number(item.changePct));
            const change = Number(item.changePct);
            const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
            const signal = SIGNALS[item.signal];
            const isSelected = selectedCrop === item.id;
            return <tr key={item.id} className={isSelected ? "sb-board__row--selected" : ""}>
              <th scope="row"><button className="sb-board__crop" onClick={() => onSelectCrop?.(item.id)} aria-pressed={isSelected}>
                <CropImage id={item.id} name={item.nameHi || item.name} size="sm" />
                <span><strong>{item.nameHi || item.name}</strong><small>{item.mandiCount ? `${number(item.mandiCount)} मंडियाँ` : "रिकॉर्ड उपलब्ध"}</small></span>
              </button></th>
              <td><strong className="sb-board__price">{Number(item.price) > 0 ? `₹${number(item.price)}` : "—"}</strong>{Number(item.msp) > 0 && <small>MSP ₹{number(item.msp)}</small>}</td>
              <td><span className={`sb-change ${change > 0 ? "sb-change--up" : change < 0 ? "sb-change--down" : "sb-change--flat"}`}>
                {changeKnown ? <><ChangeIcon size={15} aria-hidden="true" />{change > 0 ? "+" : ""}{change}%</> : "—"}
              </span></td>
              <td>{signal ? <span className={`sb-signal ${signal.className}`}>{signal.label}</span> : "—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {sorted.length > 10 && <button type="button" className="sb-more-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        {expanded ? <><ChevronUp size={17} />कम दिखाएँ</> : <><ChevronDown size={17} />सभी {sorted.length} फसलें देखें</>}
      </button>}
      <p className="sb-data-note"><Info size={15} aria-hidden="true" />बदलाव पिछले उपलब्ध भाव से है। संकेत MSP और पुराने ट्रेंड पर आधारित हैं; सौदा करने से पहले मंडी का भाव जाँचें।</p>
    </section>
  );
}
