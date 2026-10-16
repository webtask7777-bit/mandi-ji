import { districtCropMatch } from './mapStyles';
import CropImage, { CropImageLegend } from '../CropImage';

export default function MapPopup({ districtName, info, mandis = [], selectedCrop, onSelect }) {
  const topCrops = info?.topCrops?.slice(0, 5) || [];
  const records = Number.isFinite(info?.totalRecords) ? info.totalRecords.toLocaleString('hi-IN') : null;
  const listedMandis = mandis.length || (Number.isFinite(info?.mandiCount) ? info.mandiCount : info?.totalMandis);

  return (
    <div className="min-w-[210px] max-w-[270px] text-[#243b2c]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#65745c]">जिला · मंडी रिकॉर्ड</div>
      <div className="mt-1 text-base font-extrabold leading-tight text-[#174c3c]">
        {info?.nameHi || districtName}
      </div>
      {info?.nameHi && info.nameHi !== districtName && <div className="mt-0.5 text-xs text-[#63725d]">{districtName}</div>}

      <div className="my-3 flex flex-wrap gap-x-3 gap-y-1 border-y border-[#dde5d6] py-2 text-xs text-[#4b624f]">
        <span>{Number.isFinite(listedMandis) ? `${listedMandis.toLocaleString('hi-IN')} मंडियाँ` : 'मंडी सूची उपलब्ध नहीं'}</span>
        <span>{records !== null ? `${records} रिकॉर्ड` : 'रिकॉर्ड संख्या उपलब्ध नहीं'}</span>
      </div>

      {selectedCrop && (
        <p className="mb-3 rounded-md bg-[#eef3e7] p-2 text-xs leading-relaxed text-[#3a5842]">
          {districtCropMatch(info, selectedCrop) === 'matched'
            ? 'चुनी फसल का रिकॉर्ड इस जिले में मिला है।'
            : 'चुनी फसल की जिला जानकारी अधूरी है; इसका मतलब फसल की अनुपस्थिति नहीं है।'}
        </p>
      )}

      {mandis.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-bold text-[#52664c]">उपलब्ध मंडियाँ</div>
          <div className="flex flex-wrap gap-1">
            {mandis.slice(0, 5).map((mandi, index) => (
              <span key={mandi.id || `${mandi.name}-${index}`} className="rounded-md border border-[#dbe4d4] bg-[#fafbf5] px-2 py-1 text-xs text-[#3a5542]">
                {mandi.nameHi || mandi.name}
              </span>
            ))}
            {mandis.length > 5 && <span className="px-1 py-1 text-xs text-[#536a52]">+{mandis.length - 5} अन्य</span>}
          </div>
        </div>
      )}

      {topCrops.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-bold text-[#52664c]">रिकॉर्ड में प्रमुख फसलें</div>
          <div className="flex flex-wrap gap-1">
            {topCrops.map((crop, index) => (
              <span key={crop.id || crop.cropId || `${crop.name}-${index}`} className="inline-flex items-center gap-1.5 rounded-md bg-[#eaf2df] px-2 py-1 text-xs text-[#244a35]">
                <CropImage id={crop.id || crop.cropId} name={crop.nameHi || crop.name || crop.id} size="xs" />{crop.nameHi || crop.name || crop.id}
              </span>
            ))}
          </div>
        </div>
      )}

      {topCrops.length > 0 && <CropImageLegend />}
      <p className="mb-3 text-[11px] leading-relaxed text-[#687461]">रिकॉर्ड की गिनती आज के भाव या आज खुली मंडियों की पुष्टि नहीं है।</p>
      {onSelect && (
        <button type="button" onClick={onSelect} className="w-full rounded-lg bg-[#174c3c] px-3 py-2.5 text-xs font-semibold text-[#ffffff] hover:bg-[#255f48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174c3c]">
          इस जिले की सूची देखें →
        </button>
      )}
    </div>
  );
}
