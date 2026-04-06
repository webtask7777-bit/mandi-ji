import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useStateContext } from '../context/StateContext';
import LeafletMap from '../components/LeafletMap/LeafletMap';
import CropFilter from '../components/LeafletMap/CropFilter';
import StateExplorer from '../components/StateExplorer';

export default function NakshaTab({ selectedMonth, districts, mandis, states, isCG, crops = [] }) {
  const { selectedState, stateNameHi } = useStateContext();
  const [selectedCrop, setSelectedCrop] = useState(null);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="text-[10px] text-muted-foreground tracking-wider font-semibold">
        {selectedState ? `${stateNameHi} का नक्शा` : 'भारत का नक्शा'}
      </div>

      {/* Crop Filter */}
      {crops.length > 0 && (
        <CropFilter
          crops={crops}
          selectedCrop={selectedCrop}
          onCropSelect={setSelectedCrop}
        />
      )}

      {/* Interactive Map */}
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden p-0">
        <LeafletMap
          stateData={states}
          districts={districts}
          mandis={mandis}
          selectedCrop={selectedCrop}
        />
      </Card>

      {/* Hint text */}
      {!selectedState && (
        <Card className="bg-zinc-900 border-zinc-800 p-3 text-center text-[11px] text-muted-foreground">
          किसी भी राज्य पर टैप करें डेटा देखने के लिए
        </Card>
      )}

      {/* State summary + explorer (when state selected) */}
      {selectedState && districts?.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-zinc-900 border-zinc-800 p-2.5 text-center">
              <div className="text-base font-extrabold text-green-500">{districts.length}</div>
              <div className="text-[8px] text-muted-foreground tracking-wide">ज़िले</div>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 p-2.5 text-center">
              <div className="text-base font-extrabold text-amber-500">{mandis?.length || 0}</div>
              <div className="text-[8px] text-muted-foreground tracking-wide">मंडी</div>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800 p-2.5 text-center">
              <div className="text-base font-extrabold text-green-500">
                {districts.reduce((sum, d) => sum + (d.totalRecords || 0), 0)}
              </div>
              <div className="text-[8px] text-muted-foreground tracking-wide">रिकॉर्ड</div>
            </Card>
          </div>
          <StateExplorer districts={districts} mandis={mandis} />
        </>
      )}

      {selectedState && (!districts || districts.length === 0) && (
        <Card className="bg-zinc-900 border-zinc-800 p-6 text-center">
          <div className="text-amber-500 text-2xl mb-2">⏳</div>
          <div className="text-sm font-bold text-foreground mb-1">डेटा अपडेट हो रहा है</div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            {stateNameHi} का मंडी डेटा जल्द ही उपलब्ध होगा।<br/>
            कृपया बाद में चेक करें।
          </div>
        </Card>
      )}
    </div>
  );
}
