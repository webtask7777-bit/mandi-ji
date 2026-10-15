import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers3, Search, X } from 'lucide-react';
import CropImage from '../CropImage';

export default function CropFilter({ crops = [], selectedCrop, onCropSelect }) {
  const scrollRef = useRef(null);
  const [query, setQuery] = useState('');
  const recordCrops = useMemo(() => crops.filter(crop => crop.totalRecords > 0).sort((a, b) => b.totalRecords - a.totalRecords), [crops]);
  const matches = recordCrops.filter(crop => `${crop.nameHi || ''} ${crop.name || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleCrops = query.trim() ? matches : recordCrops.slice(0, 20);
  const activeCrop = recordCrops.find(crop => crop.id === selectedCrop);
  if (activeCrop && !visibleCrops.some(crop => crop.id === selectedCrop) && !query.trim()) visibleCrops.push(activeCrop);

  useEffect(() => {
    scrollRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedCrop]);

  return <section className="sb-map-crop-filter" aria-label="नक्शे पर फसल चुनें">
    <div className="sb-map-filter-heading"><strong>किस फसल का डेटा देखें?</strong><label className="sb-secondary-search"><Search size={17} aria-hidden="true" /><span className="sr-only">फसल खोजें</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="फसल खोजें / Search crop" />{query && <button type="button" aria-label="फसल की खोज हटाएँ" onClick={() => setQuery('')}><X size={16} /></button>}</label></div>
    <div ref={scrollRef} className="sb-map-crop-chips">
      <button type="button" onClick={() => onCropSelect(null)} data-active={!selectedCrop} aria-pressed={!selectedCrop}><Layers3 size={19} />सभी फसलें</button>
      {visibleCrops.map(crop => <button type="button" key={crop.id} onClick={() => onCropSelect(selectedCrop === crop.id ? null : crop.id)} data-active={selectedCrop === crop.id} aria-pressed={selectedCrop === crop.id}><CropImage id={crop.id} name={crop.nameHi || crop.name} size="xs" />{crop.nameHi || crop.name}</button>)}
    </div>
    {query.trim() && matches.length === 0 ? <p className="sb-data-caption">इस नाम की फसल के रिकॉर्ड नहीं मिले। हिंदी या English में दूसरा नाम खोजें।</p> : <p className="sb-data-caption">{query.trim() ? `${matches.length} फसलें मिलीं` : 'अधिक रिकॉर्ड वाली फसलें दिखाई गई हैं। दूसरी फसल के लिए खोजें।'}</p>}
  </section>;
}
