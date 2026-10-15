import { ArrowUpRight, ArrowDownRight, ChevronRight, Minus } from "lucide-react";
import CropImage from "./CropImage";

const money = value => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function PriceCard({ crop, onClick }) {
  const hasMsp = Number(crop.msp) > 0;
  const hasMarket = Number(crop.market) > 0;
  if (!hasMarket && !hasMsp) return null;

  const hasChange = crop.changePct != null && Number.isFinite(Number(crop.changePct));
  const change = Number(crop.changePct);
  const changeClass = change > 0 ? "sb-change--up" : change < 0 ? "sb-change--down" : "sb-change--flat";
  const ChangeIcon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const mspDiff = hasMsp && hasMarket ? ((crop.market - crop.msp) / crop.msp) * 100 : null;

  return (
    <button type="button" className="sb-price-card" onClick={onClick}
      aria-label={`${crop.displayName || crop.nameHi || crop.name} का भाव देखें`}>
      <div className="sb-price-card__heading">
        <CropImage id={crop.id} name={crop.nameHi || crop.name} size="md" />
        <div><h3>{crop.displayName || crop.nameHi || crop.name}</h3>
          <span>{crop.mandiCount ? `${money(crop.mandiCount)} मंडियों के रिकॉर्ड` : "उपलब्ध बाज़ार रिकॉर्ड"}</span>
        </div>
        <ChevronRight size={18} aria-hidden="true" />
      </div>
      <div className="sb-price-card__quote">
        <span>{crop.priceLabel || "उपलब्ध थोक भाव"}</span>
        <strong>{hasMarket ? `₹${money(crop.market)}` : "भाव उपलब्ध नहीं"}</strong>
        {hasMarket && <small>प्रति क्विंटल</small>}
      </div>
      <div className="sb-price-card__footer">
        {hasMsp ? (
          <><span>MSP <b>₹{money(crop.msp)}</b></span>
            {mspDiff != null && <span className={mspDiff >= 0 ? "sb-change--up" : "sb-change--down"}>
              {Math.abs(mspDiff).toFixed(1)}% {mspDiff >= 0 ? "ऊपर" : "नीचे"}
            </span>}
          </>
        ) : hasChange ? (
          <><span>{crop.changeBasis || 'पिछले उपलब्ध भाव से'}</span><span className={`sb-change ${changeClass}`}>
            <ChangeIcon size={14} aria-hidden="true" />{change > 0 ? "+" : ""}{change}%
          </span></>
        ) : <span>तारीख व मंडी का विवरण देखें</span>}
      </div>
    </button>
  );
}
