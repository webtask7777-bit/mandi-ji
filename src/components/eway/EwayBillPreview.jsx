import { FileText, Printer } from 'lucide-react';

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function formatCurrency(num) {
  return new Intl.NumberFormat('hi-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);
}

function StatusBadge({ status }) {
  const styles = {
    generated: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    active: 'bg-green-500/15 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
    expired: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
    preview: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  const labels = {
    generated: 'जनरेटेड',
    active: 'सक्रिय',
    cancelled: 'रद्द',
    expired: 'समाप्त',
    preview: 'पूर्वावलोकन',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || styles.generated}`}>
      {labels[status] || status}
    </span>
  );
}

export default function EwayBillPreview({ bill, isPreview = false }) {
  if (!bill) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="eway-bill-container">
      {/* Screen version (dark theme) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden print:hidden">
        {/* Header */}
        <div className="bg-green-500/10 border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-green-500" />
              <div>
                <div className="text-sm font-bold text-foreground">E-way Bill</div>
                <div className="text-[10px] text-zinc-500">मंडीजी - कृषि बाज़ार</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={bill.status} />
              {!isPreview && (
                <button
                  onClick={handlePrint}
                  className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                >
                  <Printer size={12} className="text-zinc-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bill Number */}
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[9px] text-zinc-500">बिल नंबर</div>
              <div className="text-sm font-mono font-bold text-green-500">{bill.billNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-zinc-500">दस्तावेज़ तिथि</div>
              <div className="text-xs text-foreground">{formatDate(bill.docDate)}</div>
            </div>
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 divide-x divide-zinc-800 border-b border-zinc-800">
          {/* From */}
          <div className="px-3 py-2.5">
            <div className="text-[9px] font-bold text-green-500 mb-1">भेजने वाला (From)</div>
            <div className="text-xs font-semibold text-foreground">{bill.from?.name || '-'}</div>
            {bill.from?.gstin && (
              <div className="text-[10px] text-zinc-400 font-mono">{bill.from.gstin}</div>
            )}
            <div className="text-[10px] text-zinc-500 mt-0.5">{bill.from?.address || '-'}</div>
            <div className="text-[10px] text-zinc-500">
              {bill.from?.state || '-'} {bill.from?.pincode ? `- ${bill.from.pincode}` : ''}
            </div>
          </div>
          {/* To */}
          <div className="px-3 py-2.5">
            <div className="text-[9px] font-bold text-amber-500 mb-1">प्राप्तकर्ता (To)</div>
            <div className="text-xs font-semibold text-foreground">{bill.to?.name || '-'}</div>
            {bill.to?.gstin && (
              <div className="text-[10px] text-zinc-400 font-mono">{bill.to.gstin}</div>
            )}
            <div className="text-[10px] text-zinc-500 mt-0.5">{bill.to?.address || '-'}</div>
            <div className="text-[10px] text-zinc-500">
              {bill.to?.state || '-'} {bill.to?.pincode ? `- ${bill.to.pincode}` : ''}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-b border-zinc-800">
          <div className="px-3 py-1.5 bg-zinc-950">
            <div className="text-[9px] font-bold text-zinc-400">सामान विवरण</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-zinc-950 text-zinc-500">
                  <th className="text-left px-3 py-1.5 font-medium">सामान</th>
                  <th className="text-left px-2 py-1.5 font-medium">HSN</th>
                  <th className="text-right px-2 py-1.5 font-medium">मात्रा</th>
                  <th className="text-right px-3 py-1.5 font-medium">मूल्य</th>
                </tr>
              </thead>
              <tbody>
                {(bill.items || []).map((item, i) => (
                  <tr key={i} className="border-t border-zinc-800/50">
                    <td className="px-3 py-1.5 text-foreground font-medium">{item.cropName}</td>
                    <td className="px-2 py-1.5 text-zinc-400 font-mono">{item.hsnCode || '-'}</td>
                    <td className="text-right px-2 py-1.5 text-foreground">{item.quantity} {item.unit}</td>
                    <td className="text-right px-3 py-1.5 text-green-400 font-medium">{formatCurrency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-700">
                  <td colSpan={3} className="px-3 py-1.5 text-right font-bold text-zinc-400">कुल मूल्य</td>
                  <td className="text-right px-3 py-1.5 font-bold text-green-500">{formatCurrency(bill.totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Transport Details */}
        <div className="px-3 py-2.5 border-b border-zinc-800">
          <div className="text-[9px] font-bold text-zinc-400 mb-1.5">परिवहन विवरण</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[9px] text-zinc-500">माध्यम</div>
              <div className="text-xs text-foreground capitalize">{bill.transport?.mode || 'road'}</div>
            </div>
            <div>
              <div className="text-[9px] text-zinc-500">वाहन नंबर</div>
              <div className="text-xs text-foreground font-mono">{bill.transport?.vehicleNumber || '-'}</div>
            </div>
            <div>
              <div className="text-[9px] text-zinc-500">दूरी</div>
              <div className="text-xs text-foreground">{bill.transport?.distance || '-'} km</div>
            </div>
          </div>
        </div>

        {/* Validity */}
        <div className="px-3 py-2.5 bg-zinc-950">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[9px] text-zinc-500">वैध तिथि से</div>
              <div className="text-xs text-foreground">{formatDate(bill.validFrom)}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-zinc-500">वैध तिथि तक</div>
              <div className="text-xs text-foreground">{formatDate(bill.validUntil)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print version (white background) */}
      <div className="hidden print:block bg-white text-black p-6 text-sm">
        <style>{`
          @media print {
            body { background: white !important; }
            .eway-bill-container { background: white !important; }
          }
        `}</style>

        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-lg font-bold">E-way Bill</h1>
          <div className="text-xs text-gray-500">MandiJi - Agricultural Marketplace</div>
          <div className="text-base font-mono font-bold mt-1">{bill.billNumber}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-300 rounded p-3">
            <div className="text-xs font-bold text-gray-600 mb-1">From (भेजने वाला)</div>
            <div className="font-semibold">{bill.from?.name}</div>
            {bill.from?.gstin && <div className="text-xs text-gray-500">GSTIN: {bill.from.gstin}</div>}
            <div className="text-xs">{bill.from?.address}</div>
            <div className="text-xs">{bill.from?.state} - {bill.from?.pincode}</div>
          </div>
          <div className="border border-gray-300 rounded p-3">
            <div className="text-xs font-bold text-gray-600 mb-1">To (प्राप्तकर्ता)</div>
            <div className="font-semibold">{bill.to?.name}</div>
            {bill.to?.gstin && <div className="text-xs text-gray-500">GSTIN: {bill.to.gstin}</div>}
            <div className="text-xs">{bill.to?.address}</div>
            <div className="text-xs">{bill.to?.state} - {bill.to?.pincode}</div>
          </div>
        </div>

        <table className="w-full border border-gray-300 mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1 text-left">Item</th>
              <th className="border border-gray-300 px-2 py-1">HSN</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Qty</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-2 py-1">{item.cropName}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.hsnCode || '-'}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity} {item.unit}</td>
                <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
          <div><strong>Mode:</strong> {bill.transport?.mode}</div>
          <div><strong>Vehicle:</strong> {bill.transport?.vehicleNumber}</div>
          <div><strong>Distance:</strong> {bill.transport?.distance} km</div>
        </div>

        <div className="flex justify-between text-xs border-t border-gray-300 pt-2">
          <div><strong>Valid From:</strong> {formatDate(bill.validFrom)}</div>
          <div><strong>Valid Until:</strong> {formatDate(bill.validUntil)}</div>
        </div>
      </div>
    </div>
  );
}
