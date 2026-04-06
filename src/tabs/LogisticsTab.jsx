import { useState, useEffect, useRef } from "react";
import { Search, Phone, ExternalLink, MapPin, Truck, Users, Building2, ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";

const API = "http://localhost:3001/api";

const VEHICLE_OPTIONS = [
  { value: "tractor",     label: "ट्रैक्टर ट्रॉली", cap: 30 },
  { value: "pickup",      label: "पिकअप", cap: 20 },
  { value: "truck-small", label: "छोटा ट्रक", cap: 70 },
  { value: "truck-large", label: "बड़ा ट्रक", cap: 160 },
  { value: "trailer",     label: "ट्रेलर", cap: 250 },
];

const STATE_CODES = [
  "AP","AR","AS","BR","CG","GA","GJ","HR","HP","JK","JH","KA","KL","MP","MH","MN","ML","MZ","NL","OD","PB","RJ","SK","TN","TS","TR","UP","UK","WB","DL","PY","CH","AN","DN","LD"
];

const TRUCK_PLATFORMS = [
  { name: "TruckSuvidha", desc: "खाली ट्रक खोजें — All India", url: "https://www.trucksuvidha.com", icon: "🚛", col: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { name: "BlackBuck", desc: "GPS Track + बुकिंग, FTL/PTL", url: "https://blackbuck.com", icon: "🐂", col: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { name: "Vahak", desc: "Mandi-to-Mandi Transport", url: "https://vahak.in", icon: "🔗", col: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { name: "LoadShare", desc: "Part Load + Full Load", url: "https://loadshare.net", icon: "📦", col: "text-green-400 bg-green-500/10 border-green-500/20" },
  { name: "Porter", desc: "शहर के अंदर + मिनी ट्रक", url: "https://porter.in", icon: "🛺", col: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { name: "Rivigo", desc: "Reefer (Cold) + Standard", url: "https://rivigo.com", icon: "❄️", col: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  { name: "Trucksbooking", desc: "Route-wise भाड़ा rate", url: "https://www.trucksbooking.com", icon: "📍", col: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { name: "Shiprocket Cargo", desc: "B2B Cargo + COD", url: "https://www.shiprocket.in", icon: "🚀", col: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
];

const TRANSPORT_DIR = [
  // North
  { region: "उत्तर", state: "दिल्ली", hub: "Azadpur APMC", phone: "011-2769-1234", route: "All India Hub", icon: "🏛️" },
  { region: "उत्तर", state: "पंजाब", hub: "Ludhiana Transport Nagar", phone: "0161-241-5678", route: "North + Export (Pakistan border)", icon: "🌾" },
  { region: "उत्तर", state: "हरियाणा", hub: "Kundli Transport Hub, Sonipat", phone: "0130-224-1234", route: "Delhi NCR + North India", icon: "🚛" },
  { region: "उत्तर", state: "उत्तर प्रदेश", hub: "Aishbagh Mandi, Lucknow", phone: "0522-220-1234", route: "UP + Bihar + MP", icon: "🏪" },
  { region: "उत्तर", state: "राजस्थान", hub: "Muhana Mandi, Jaipur", phone: "0141-270-1234", route: "Rajasthan + Gujarat", icon: "🏜️" },
  // West
  { region: "पश्चिम", state: "महाराष्ट्र", hub: "Vashi APMC, Navi Mumbai", phone: "022-2756-7890", route: "South + Central + West India", icon: "🌊" },
  { region: "पश्चिम", state: "नागपुर", hub: "Kalamna Market, Nagpur", phone: "0712-272-0123", route: "Central India Hub (संगम)", icon: "🍊" },
  { region: "पश्चिम", state: "गुजरात", hub: "Jamalpur APMC, Ahmedabad", phone: "079-2531-2345", route: "West India + Export", icon: "💎" },
  // Central
  { region: "मध्य", state: "मध्य प्रदेश", hub: "Karond Mandi, Bhopal", phone: "0755-244-1234", route: "Central India", icon: "🌿" },
  { region: "मध्य", state: "छत्तीसगढ़", hub: "Telibandha, Raipur", phone: "0771-222-3456", route: "CG + Odisha + WB", icon: "🌳" },
  // South
  { region: "दक्षिण", state: "कर्नाटक", hub: "Yeshwanthpur APMC, Bangalore", phone: "080-2337-1234", route: "South India Hub", icon: "🌴" },
  { region: "दक्षिण", state: "केरल", hub: "Ernakulam / Chalakudy", phone: "0484-234-5678", route: "Kerala + Tamil Nadu", icon: "🥥" },
  { region: "दक्षिण", state: "तमिलनाडु", hub: "Koyambedu CMDA, Chennai", phone: "044-2471-3456", route: "TN + South India", icon: "🎭" },
  { region: "दक्षिण", state: "तेलंगाना", hub: "Gaddiannaram, Hyderabad", phone: "040-2452-1234", route: "South + Central India", icon: "🌶️" },
  { region: "दक्षिण", state: "आंध्र प्रदेश", hub: "Rythu Bazaar, Vijayawada", phone: "0866-257-1234", route: "AP + Karnataka", icon: "🍈" },
  // East
  { region: "पूर्व", state: "पश्चिम बंगाल", hub: "Kolay Market, Kolkata", phone: "033-2212-1234", route: "East India + NE", icon: "🐟" },
  { region: "पूर्व", state: "ओडिशा", hub: "Unit-1 Mandi, Bhubaneswar", phone: "0674-239-1234", route: "Odisha + CG + WB", icon: "🏖️" },
  { region: "पूर्व", state: "बिहार", hub: "Mithapur Mandi, Patna", phone: "0612-222-3456", route: "Bihar + UP + Jharkhand", icon: "🌾" },
  { region: "पूर्व", state: "झारखंड", hub: "Lalpur, Ranchi", phone: "0651-246-1234", route: "Jharkhand + WB + Odisha", icon: "⛏️" },
];

const REGIONS = ["सभी", "उत्तर", "पश्चिम", "मध्य", "दक्षिण", "पूर्व"];

const MAJOR_APMC = [
  { name: "Azadpur APMC", city: "Delhi", type: "सब्जी + फल + अनाज", size: "Asia's Largest" },
  { name: "Vashi APMC", city: "Navi Mumbai", type: "All Commodities", size: "Maharashtra #1" },
  { name: "Yeshwanthpur", city: "Bangalore", type: "सब्जी + फल", size: "South India Hub" },
  { name: "Koyambedu CMDA", city: "Chennai", type: "सब्जी + फल", size: "TN Largest" },
  { name: "Kolay Market", city: "Kolkata", type: "सब्जी + फल", size: "East India Hub" },
  { name: "Gaddiannaram", city: "Hyderabad", type: "सब्जी + फल", size: "Telangana #1" },
  { name: "Jamalpur APMC", city: "Ahmedabad", type: "अनाज + सब्जी", size: "Gujarat #1" },
  { name: "Kalamna Market", city: "Nagpur", type: "अनाज + Orange", size: "Central Hub" },
  { name: "Muhana Mandi", city: "Jaipur", type: "अनाज + सब्जी", size: "Rajasthan #1" },
  { name: "Karond Mandi", city: "Bhopal", type: "अनाज + सब्जी", size: "MP Hub" },
  { name: "Mithapur", city: "Patna", type: "सब्जी + अनाज", size: "Bihar #1" },
  { name: "Chalakudy", city: "Kerala", type: "सब्जी + Spices", size: "Kerala Hub" },
];

export default function LogisticsTab() {
  const [section, setSection] = useState("truck"); // truck | traders | directory | board
  const [boardTab, setBoardTab] = useState("trucks"); // trucks | loads
  const [mandiSearch, setMandiSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("सभी");
  const [dirSearch, setDirSearch] = useState("");

  // Transport board state
  const [boardFrom, setBoardFrom] = useState("");
  const [boardTo, setBoardTo] = useState("");
  const [boardListings, setBoardListings] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({
    name: "", phone: "", fromState: "", fromCity: "", toState: "", toCity: "",
    vehicleType: "", ratePerKm: "", availableDate: "", notes: ""
  });
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deletePhone, setDeletePhone] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Load board state
  const [loadListings, setLoadListings] = useState([]);
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showLoadForm, setShowLoadForm] = useState(false);
  const [loadForm, setLoadForm] = useState({
    name: "", phone: "", fromState: "", fromCity: "", toState: "", toCity: "",
    commodity: "", quantityQ: "", loadDate: "", rateOffered: "", notes: ""
  });
  const [loadPosting, setLoadPosting] = useState(false);
  const [loadPostMsg, setLoadPostMsg] = useState("");
  const [loadDeleteId, setLoadDeleteId] = useState(null);
  const [loadDeletePhone, setLoadDeletePhone] = useState("");
  const [loadDeleting, setLoadDeleting] = useState(false);

  const fetchBoard = async (from = boardFrom, to = boardTo) => {
    setBoardLoading(true);
    setBoardError("");
    try {
      const params = new URLSearchParams();
      if (from.trim()) params.set("from", from.trim());
      if (to.trim()) params.set("to", to.trim());
      const r = await fetch(`${API}/transport-board?${params}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setBoardListings(data);
    } catch (e) {
      setBoardError(e.message);
    } finally {
      setBoardLoading(false);
    }
  };

  useEffect(() => {
    if (section === "board") fetchBoard("", "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handlePost = async () => {
    setPosting(true);
    setPostMsg("");
    try {
      const r = await fetch(`${API}/transport-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postForm),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setPostMsg("✅ आपकी गाड़ी पोस्ट हो गई!");
      setShowPostForm(false);
      setPostForm({ name: "", phone: "", fromState: "", fromCity: "", toState: "", toCity: "", vehicleType: "", ratePerKm: "", availableDate: "", notes: "" });
      fetchBoard(boardFrom, boardTo);
    } catch (e) {
      setPostMsg("❌ " + e.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      const r = await fetch(`${API}/transport-board/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: deletePhone }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setDeleteId(null);
      setDeletePhone("");
      fetchBoard(boardFrom, boardTo);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const fetchLoads = async (from = boardFrom, to = boardTo) => {
    setLoadLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (from.trim()) params.set("from", from.trim());
      if (to.trim()) params.set("to", to.trim());
      const r = await fetch(`${API}/load-board?${params}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setLoadListings(data);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoadLoading(false);
    }
  };

  useEffect(() => {
    if (section === "board" && boardTab === "loads") fetchLoads("", "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, boardTab]);

  const handleLoadPost = async () => {
    setLoadPosting(true);
    setLoadPostMsg("");
    try {
      const r = await fetch(`${API}/load-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loadForm),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setLoadPostMsg("✅ माल पोस्ट हो गया!");
      setShowLoadForm(false);
      setLoadForm({ name: "", phone: "", fromState: "", fromCity: "", toState: "", toCity: "", commodity: "", quantityQ: "", loadDate: "", rateOffered: "", notes: "" });
      fetchLoads(boardFrom, boardTo);
    } catch (e) {
      setLoadPostMsg("❌ " + e.message);
    } finally {
      setLoadPosting(false);
    }
  };

  const handleLoadDelete = async (id) => {
    setLoadDeleting(true);
    try {
      const r = await fetch(`${API}/load-board/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loadDeletePhone }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setLoadDeleteId(null);
      setLoadDeletePhone("");
      fetchLoads(boardFrom, boardTo);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoadDeleting(false);
    }
  };

  const filteredDir = TRANSPORT_DIR.filter(t => {
    const matchRegion = regionFilter === "सभी" || t.region === regionFilter;
    const q = dirSearch.toLowerCase();
    const matchSearch = !dirSearch || t.state.includes(dirSearch) || t.hub.toLowerCase().includes(q) || t.route.toLowerCase().includes(q);
    return matchRegion && matchSearch;
  });

  const gmapsTraderSearch = (mandi) => {
    const q = encodeURIComponent(`${mandi} mandi commission agent trader`);
    window.open(`https://maps.google.com/?q=${q}`, "_blank");
  };

  const gmapsMandiSearch = (mandi) => {
    const q = encodeURIComponent(`${mandi} APMC mandi`);
    window.open(`https://maps.google.com/?q=${q}`, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="text-[10px] text-muted-foreground tracking-wider font-semibold">🚛 लॉजिस्टिक्स & संपर्क</div>
        <div className="text-[9px] text-zinc-600 mt-0.5">ट्रांसपोर्टर · व्यापारी · मंडी डायरेक्टरी — All India</div>
      </div>

      {/* Section Switcher */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {[
          { id: "truck", icon: "🚛", label: "ट्रक बुकिंग" },
          { id: "traders", icon: "🧑‍💼", label: "व्यापारी खोजें" },
          { id: "directory", icon: "📋", label: "डायरेक्टरी" },
          { id: "board", icon: "🚚", label: "खाली ट्रक" },
        ].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex-1 min-w-max py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all border shrink-0 ${
              section === s.id
                ? "bg-green-500 text-green-950 border-green-500"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── SECTION: TRUCK BOOKING ── */}
      {section === "truck" && (
        <div className="space-y-2">
          <div className="text-[9px] text-zinc-500 px-0.5">खाली ट्रक ढूंढें — सीधे platform पर जाएं</div>
          <div className="grid grid-cols-2 gap-2">
            {TRUCK_PLATFORMS.map(p => (
              <button key={p.name}
                onClick={() => window.open(p.url, "_blank")}
                className={`flex items-start gap-2 p-3 rounded-xl border text-left active:scale-[0.97] transition-all ${p.col}`}>
                <span className="text-xl shrink-0">{p.icon}</span>
                <div className="min-w-0">
                  <div className={`text-[11px] font-bold ${p.col.split(' ')[0]}`}>{p.name}</div>
                  <div className="text-[9px] text-zinc-500 leading-tight mt-0.5">{p.desc}</div>
                  <div className="flex items-center gap-0.5 mt-1.5">
                    <ExternalLink size={8} className="text-zinc-600"/>
                    <span className="text-[8px] text-zinc-600">खोलें</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Tips */}
          <Card className="bg-zinc-900 border-zinc-800 p-3">
            <div className="text-[9px] text-amber-400 font-bold mb-2">💡 ट्रक बुकिंग टिप्स</div>
            <div className="space-y-1.5">
              {[
                "Return Load (Back-haul) वाले ट्रक लें — किराया 15–25% कम होता है",
                "₹50,000+ माल के लिए E-Way Bill बनाना अनिवार्य है",
                "GPS वाले ट्रक ही बुक करें — रियल-टाइम tracking ज़रूरी",
                "Reefer (Cold Storage) ट्रक: Rivigo / Snowman Logistics",
                "10 टन से ज़्यादा माल → Full Truck Load (FTL) सस्ता पड़ता है",
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[9px] text-green-500 font-bold shrink-0">✓</span>
                  <span className="text-[9px] text-zinc-400 leading-tight">{t}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── SECTION: TRADERS ── */}
      {section === "traders" && (
        <div className="space-y-2">
          {/* Search bar */}
          <Card className="bg-zinc-900 border-zinc-800 p-3">
            <div className="text-[9px] text-zinc-400 font-bold mb-2">🔍 मंडी के पास व्यापारी खोजें (Google Maps)</div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5">
                <Search size={12} className="text-zinc-500 shrink-0"/>
                <input
                  type="text"
                  value={mandiSearch}
                  onChange={e => setMandiSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && mandiSearch && gmapsTraderSearch(mandiSearch)}
                  placeholder="मंडी का नाम लिखें..."
                  className="bg-transparent text-[11px] text-foreground w-full outline-none placeholder:text-zinc-600"
                />
              </div>
              <button
                onClick={() => mandiSearch && gmapsTraderSearch(mandiSearch)}
                className="px-3 py-1.5 bg-green-500 text-green-950 rounded-lg text-[10px] font-bold active:scale-95 transition-all shrink-0">
                खोजें
              </button>
            </div>
            <div className="text-[8px] text-zinc-600 mt-1.5">Google Maps पर "commission agent", "थोक व्यापारी" दिखेगा</div>
          </Card>

          {/* Quick city buttons */}
          <div>
            <div className="text-[9px] text-zinc-500 mb-1.5">प्रमुख मंडी शहर</div>
            <div className="flex flex-wrap gap-1.5">
              {["Azadpur Delhi", "Vashi Mumbai", "Yeshwanthpur Bangalore", "Koyambedu Chennai",
                "Kolay Kolkata", "Gaddiannaram Hyderabad", "Muhana Jaipur", "Kalamna Nagpur",
                "Jamalpur Ahmedabad", "Aishbagh Lucknow", "Mithapur Patna", "Ernakulam Kerala",
              ].map(city => (
                <button key={city} onClick={() => gmapsTraderSearch(city)}
                  className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-[9px] text-zinc-300 hover:border-zinc-500 active:scale-95 transition-all">
                  {city.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Major APMC list */}
          <div>
            <div className="text-[9px] text-zinc-500 mb-1.5">भारत की प्रमुख APMC मंडियाँ</div>
            <div className="space-y-1.5">
              {MAJOR_APMC.map(m => (
                <Card key={m.name} className="bg-zinc-900 border-zinc-800 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-foreground">{m.name}</div>
                      <div className="text-[9px] text-zinc-500">{m.city} · {m.type}</div>
                      <div className="text-[8px] text-amber-500 mt-0.5">{m.size}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => gmapsMandiSearch(m.name + " " + m.city)}
                        className="p-1.5 bg-blue-500/15 border border-blue-500/25 rounded-lg active:scale-95 transition-all">
                        <MapPin size={11} className="text-blue-400"/>
                      </button>
                      <button
                        onClick={() => gmapsTraderSearch(m.name + " " + m.city + " commission agent")}
                        className="p-1.5 bg-green-500/15 border border-green-500/25 rounded-lg active:scale-95 transition-all">
                        <Users size={11} className="text-green-400"/>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: TRANSPORT DIRECTORY ── */}
      {section === "directory" && (
        <div className="space-y-2">
          {/* Search */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
            <Search size={12} className="text-zinc-500 shrink-0"/>
            <input
              type="text"
              value={dirSearch}
              onChange={e => setDirSearch(e.target.value)}
              placeholder="राज्य / मंडी / रूट खोजें..."
              className="bg-transparent text-[11px] text-foreground w-full outline-none placeholder:text-zinc-600"
            />
          </div>

          {/* Region filter */}
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {REGIONS.map(r => (
              <button key={r} onClick={() => setRegionFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold shrink-0 transition-all ${
                  regionFilter === r
                    ? "bg-green-500 text-green-950"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}>
                {r}
              </button>
            ))}
          </div>

          <div className="text-[8px] text-zinc-600 px-0.5">* नंबर APMC/Transport Union के office नंबर हैं — verify करके save करें</div>

          {/* Directory list */}
          <div className="space-y-1.5">
            {filteredDir.map((t, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-base shrink-0 mt-px">{t.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-foreground">{t.state}</span>
                        <span className="text-[7px] px-1 py-0.5 bg-zinc-800 text-zinc-500 rounded">{t.region}</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 truncate">{t.hub}</div>
                      <div className="text-[8px] text-amber-500 mt-0.5">📍 {t.route}</div>
                    </div>
                  </div>
                  <a href={`tel:${t.phone.replace(/-/g, "")}`}
                    className="flex items-center gap-1 px-2 py-1.5 bg-green-500/15 border border-green-500/25 rounded-lg shrink-0 active:scale-95 transition-all">
                    <Phone size={10} className="text-green-400"/>
                    <span className="text-[9px] text-green-400 font-bold">कॉल</span>
                  </a>
                </div>
                <div className="mt-1.5 text-[8px] text-zinc-700 font-mono">{t.phone}</div>
              </Card>
            ))}
          </div>

          {filteredDir.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-[11px]">कोई नतीजा नहीं मिला</div>
          )}

          {/* Disclaimer */}
          <Card className="bg-zinc-900 border-zinc-800 p-2.5">
            <div className="text-[8px] text-zinc-600 leading-relaxed">
              ⚠️ यह directory APMC office और transport union के public नंबर पर आधारित है। कारोबार शुरू करने से पहले नंबर verify करें। व्यक्तिगत दलाल/एजेंट के नंबर के लिए Google Maps पर स्थानीय खोज करें।
            </div>
          </Card>
        </div>
      )}

      {/* ── SECTION: TRANSPORT BOARD ── */}
      {section === "board" && (
        <div className="space-y-2">
          {/* Sub-tab switcher */}
          <div className="flex gap-1.5">
            <button onClick={() => setBoardTab("trucks")}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                boardTab === "trucks"
                  ? "bg-amber-500 text-amber-950 border-amber-500"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
              }`}>
              🚚 खाली ट्रक देखें
            </button>
            <button onClick={() => setBoardTab("loads")}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                boardTab === "loads"
                  ? "bg-blue-500 text-blue-950 border-blue-500"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
              }`}>
              📦 माल पोस्ट करें
            </button>
          </div>

          {/* Shared search bar */}
          <Card className="bg-zinc-900 border-zinc-800 p-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <div className="text-[8px] text-zinc-500 mb-1">From (शहर/राज्य)</div>
                <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5">
                  <Search size={11} className="text-zinc-500 shrink-0"/>
                  <input type="text" value={boardFrom} onChange={e => setBoardFrom(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { boardTab === "trucks" ? fetchBoard() : fetchLoads(); } }}
                    placeholder="Nagpur, MH..."
                    className="bg-transparent text-[11px] text-foreground w-full outline-none placeholder:text-zinc-600"/>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[8px] text-zinc-500 mb-1">To (शहर/राज्य)</div>
                <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5">
                  <Search size={11} className="text-zinc-500 shrink-0"/>
                  <input type="text" value={boardTo} onChange={e => setBoardTo(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { boardTab === "trucks" ? fetchBoard() : fetchLoads(); } }}
                    placeholder="Chennai, TN..."
                    className="bg-transparent text-[11px] text-foreground w-full outline-none placeholder:text-zinc-600"/>
                </div>
              </div>
              <button onClick={() => boardTab === "trucks" ? fetchBoard() : fetchLoads()}
                className="px-3 py-1.5 bg-green-500 text-green-950 rounded-lg text-[10px] font-bold active:scale-95 transition-all shrink-0">
                खोजें
              </button>
            </div>
          </Card>

          {/* ── TRUCKS TAB ── */}
          {boardTab === "trucks" && (
            <div className="space-y-2">
              <div className="text-[9px] text-zinc-500 px-0.5">ट्रक owners द्वारा पोस्ट की गई खाली गाड़ियाँ — सीधे फोन नंबर</div>

              <button onClick={() => setShowPostForm(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border font-bold text-[11px] transition-all ${
                  showPostForm ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}>
                <span className="flex items-center gap-1.5"><Plus size={13}/> अपनी खाली गाड़ी पोस्ट करें</span>
                {showPostForm ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              </button>

              {showPostForm && (
                <Card className="bg-zinc-900 border-zinc-700 p-3 space-y-2.5">
                  <div className="text-[10px] font-bold text-amber-400">🚚 अपनी खाली गाड़ी की जानकारी भरें</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "name", label: "आपका नाम *", placeholder: "Ramesh Yadav", type: "text" },
                      { key: "phone", label: "फोन नंबर * (10 अंक)", placeholder: "9876543210", type: "tel" },
                      { key: "fromCity", label: "From शहर *", placeholder: "Nagpur", type: "text" },
                      { key: "toCity", label: "To शहर *", placeholder: "Chennai", type: "text" },
                    ].map(f => (
                      <div key={f.key}>
                        <div className="text-[8px] text-zinc-500 mb-1">{f.label}</div>
                        <input type={f.type} value={postForm[f.key]} onChange={e => setPostForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">From राज्य</div>
                      <select value={postForm.fromState} onChange={e => setPostForm(p => ({ ...p, fromState: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none">
                        <option value="">-- राज्य --</option>
                        {STATE_CODES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">To राज्य</div>
                      <select value={postForm.toState} onChange={e => setPostForm(p => ({ ...p, toState: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none">
                        <option value="">-- राज्य --</option>
                        {STATE_CODES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">वाहन प्रकार *</div>
                      <select value={postForm.vehicleType} onChange={e => setPostForm(p => ({ ...p, vehicleType: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none">
                        <option value="">-- चुनें --</option>
                        {VEHICLE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label} ({v.cap}q)</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">₹ Rate/km</div>
                      <input type="number" value={postForm.ratePerKm} onChange={e => setPostForm(p => ({ ...p, ratePerKm: e.target.value }))}
                        placeholder="25"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-zinc-500 mb-1">उपलब्धता तारीख *</div>
                    <input type="date" value={postForm.availableDate} onChange={e => setPostForm(p => ({ ...p, availableDate: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500"/>
                  </div>
                  <div>
                    <div className="text-[8px] text-zinc-500 mb-1">नोट्स (वैकल्पिक)</div>
                    <input type="text" value={postForm.notes} onChange={e => setPostForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Loading point, माल का type, condition..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                  </div>
                  {postMsg && <div className="text-[10px] text-center font-bold text-green-400">{postMsg}</div>}
                  <button onClick={handlePost} disabled={posting}
                    className="w-full py-2 bg-green-500 text-green-950 rounded-xl font-bold text-[11px] active:scale-95 transition-all disabled:opacity-50">
                    {posting ? "पोस्ट हो रहा है..." : "✅ पोस्ट करें"}
                  </button>
                  <div className="text-[8px] text-zinc-600 text-center">* Listing 7 दिन बाद auto-expire होगी। Delete के लिए phone नंबर ज़रूरी।</div>
                </Card>
              )}

              {boardLoading && <div className="text-center py-6 text-zinc-500 text-[11px]">लोड हो रहा है...</div>}
              {boardError && <div className="text-center py-4 text-red-400 text-[11px]">{boardError}</div>}
              {!boardLoading && !boardError && boardListings.length === 0 && (
                <div className="text-center py-8 space-y-1">
                  <div className="text-2xl">🚚</div>
                  <div className="text-[11px] text-zinc-500">कोई खाली ट्रक नहीं मिला</div>
                  <div className="text-[9px] text-zinc-600">पहले पोस्ट करें → दूसरे आपको देखेंगे</div>
                </div>
              )}
              {!boardLoading && boardListings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[9px] text-zinc-500">{boardListings.length} गाड़ी मिली</div>
                  {boardListings.map(t => (
                    <Card key={t.id} className="bg-zinc-900 border-zinc-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold text-amber-400">{t.vehicleName}</span>
                            <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">{t.capacityQ}q</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-foreground mb-1">
                            <span className="font-semibold">{t.fromCity}{t.fromState ? `, ${t.fromState}` : ""}</span>
                            <span className="text-zinc-600">→</span>
                            <span className="font-semibold">{t.toCity}{t.toState ? `, ${t.toState}` : ""}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[8px] text-zinc-400">📅 {t.availableDate}</span>
                            {t.ratePerKm > 0 && <span className="text-[8px] text-green-400">₹{t.ratePerKm}/km</span>}
                            <span className="text-[8px] text-zinc-500">{t.name}</span>
                          </div>
                          {t.notes && <div className="text-[8px] text-zinc-600 mt-1 italic">"{t.notes}"</div>}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <a href={`tel:${t.phone}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/15 border border-green-500/30 rounded-lg active:scale-95 transition-all">
                            <Phone size={11} className="text-green-400"/>
                            <span className="text-[10px] text-green-400 font-bold">{t.phone}</span>
                          </a>
                          {deleteId === t.id ? (
                            <div className="flex items-center gap-1">
                              <input type="tel" value={deletePhone} onChange={e => setDeletePhone(e.target.value)}
                                placeholder="Phone verify"
                                className="w-24 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[9px] text-foreground outline-none placeholder:text-zinc-600"/>
                              <button onClick={() => handleDelete(t.id)} disabled={deleting}
                                className="px-1.5 py-1 bg-red-500/20 border border-red-500/30 rounded text-[8px] text-red-400 font-bold">
                                {deleting ? "..." : "हटाएं"}
                              </button>
                              <button onClick={() => { setDeleteId(null); setDeletePhone(""); }}
                                className="px-1.5 py-1 bg-zinc-800 rounded text-[8px] text-zinc-400">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteId(t.id)}
                              className="p-1 bg-zinc-800 border border-zinc-700 rounded active:scale-95 transition-all">
                              <Trash2 size={10} className="text-zinc-500"/>
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LOADS TAB ── */}
          {boardTab === "loads" && (
            <div className="space-y-2">
              <div className="text-[9px] text-zinc-500 px-0.5">माल भेजने वालों की जरूरतें — ट्रक owner सीधे call करें</div>

              <button onClick={() => setShowLoadForm(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border font-bold text-[11px] transition-all ${
                  showLoadForm ? "bg-blue-500/15 border-blue-500/30 text-blue-400" : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}>
                <span className="flex items-center gap-1.5"><Plus size={13}/> मुझे गाड़ी चाहिए — माल पोस्ट करें</span>
                {showLoadForm ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              </button>

              {showLoadForm && (
                <Card className="bg-zinc-900 border-zinc-700 p-3 space-y-2.5">
                  <div className="text-[10px] font-bold text-blue-400">📦 अपना माल पोस्ट करें — ट्रक owner आपसे contact करेंगे</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "name", label: "आपका नाम *", placeholder: "Ramesh Ji", type: "text" },
                      { key: "phone", label: "फोन नंबर * (10 अंक)", placeholder: "9876543210", type: "tel" },
                      { key: "fromCity", label: "From शहर *", placeholder: "Nagpur", type: "text" },
                      { key: "toCity", label: "To शहर *", placeholder: "Delhi", type: "text" },
                    ].map(f => (
                      <div key={f.key}>
                        <div className="text-[8px] text-zinc-500 mb-1">{f.label}</div>
                        <input type={f.type} value={loadForm[f.key]} onChange={e => setLoadForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">From राज्य</div>
                      <select value={loadForm.fromState} onChange={e => setLoadForm(p => ({ ...p, fromState: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none">
                        <option value="">-- राज्य --</option>
                        {STATE_CODES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">To राज्य</div>
                      <select value={loadForm.toState} onChange={e => setLoadForm(p => ({ ...p, toState: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none">
                        <option value="">-- राज्य --</option>
                        {STATE_CODES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">फसल / माल</div>
                      <input type="text" value={loadForm.commodity} onChange={e => setLoadForm(p => ({ ...p, commodity: e.target.value }))}
                        placeholder="प्याज, गेहूं, टमाटर..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                    </div>
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">मात्रा (क्विंटल)</div>
                      <input type="number" value={loadForm.quantityQ} onChange={e => setLoadForm(p => ({ ...p, quantityQ: e.target.value }))}
                        placeholder="100"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">माल तैयारी तारीख *</div>
                      <input type="date" value={loadForm.loadDate} onChange={e => setLoadForm(p => ({ ...p, loadDate: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500"/>
                    </div>
                    <div>
                      <div className="text-[8px] text-zinc-500 mb-1">₹ Rate offered/km</div>
                      <input type="number" value={loadForm.rateOffered} onChange={e => setLoadForm(p => ({ ...p, rateOffered: e.target.value }))}
                        placeholder="20"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-zinc-500 mb-1">नोट्स (वैकल्पिक)</div>
                    <input type="text" value={loadForm.notes} onChange={e => setLoadForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Loading point, packaging type, special conditions..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-zinc-500 placeholder:text-zinc-600"/>
                  </div>
                  {loadPostMsg && <div className="text-[10px] text-center font-bold text-green-400">{loadPostMsg}</div>}
                  <button onClick={handleLoadPost} disabled={loadPosting}
                    className="w-full py-2 bg-blue-500 text-blue-950 rounded-xl font-bold text-[11px] active:scale-95 transition-all disabled:opacity-50">
                    {loadPosting ? "पोस्ट हो रहा है..." : "✅ माल पोस्ट करें"}
                  </button>
                  <div className="text-[8px] text-zinc-600 text-center">* Listing 7 दिन बाद auto-expire होगी। Delete के लिए phone नंबर ज़रूरी।</div>
                </Card>
              )}

              {loadLoading && <div className="text-center py-6 text-zinc-500 text-[11px]">लोड हो रहा है...</div>}
              {loadError && <div className="text-center py-4 text-red-400 text-[11px]">{loadError}</div>}
              {!loadLoading && !loadError && loadListings.length === 0 && (
                <div className="text-center py-8 space-y-1">
                  <div className="text-2xl">📦</div>
                  <div className="text-[11px] text-zinc-500">कोई माल नहीं मिला</div>
                  <div className="text-[9px] text-zinc-600">ऊपर form भरें → ट्रक owner खुद call करेंगे</div>
                </div>
              )}
              {!loadLoading && loadListings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[9px] text-zinc-500">{loadListings.length} माल मिला</div>
                  {loadListings.map(l => (
                    <Card key={l.id} className="bg-zinc-900 border-zinc-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {l.commodity && <span className="text-[10px] font-bold text-blue-400">{l.commodity}</span>}
                            {l.quantityQ > 0 && <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">{l.quantityQ}q</span>}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-foreground mb-1">
                            <span className="font-semibold">{l.fromCity}{l.fromState ? `, ${l.fromState}` : ""}</span>
                            <span className="text-zinc-600">→</span>
                            <span className="font-semibold">{l.toCity}{l.toState ? `, ${l.toState}` : ""}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[8px] text-zinc-400">📅 {l.loadDate}</span>
                            {l.rateOffered > 0 && <span className="text-[8px] text-blue-400">₹{l.rateOffered}/km offer</span>}
                            <span className="text-[8px] text-zinc-500">{l.name}</span>
                          </div>
                          {l.notes && <div className="text-[8px] text-zinc-600 mt-1 italic">"{l.notes}"</div>}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <a href={`tel:${l.phone}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/15 border border-blue-500/30 rounded-lg active:scale-95 transition-all">
                            <Phone size={11} className="text-blue-400"/>
                            <span className="text-[10px] text-blue-400 font-bold">{l.phone}</span>
                          </a>
                          {loadDeleteId === l.id ? (
                            <div className="flex items-center gap-1">
                              <input type="tel" value={loadDeletePhone} onChange={e => setLoadDeletePhone(e.target.value)}
                                placeholder="Phone verify"
                                className="w-24 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[9px] text-foreground outline-none placeholder:text-zinc-600"/>
                              <button onClick={() => handleLoadDelete(l.id)} disabled={loadDeleting}
                                className="px-1.5 py-1 bg-red-500/20 border border-red-500/30 rounded text-[8px] text-red-400 font-bold">
                                {loadDeleting ? "..." : "हटाएं"}
                              </button>
                              <button onClick={() => { setLoadDeleteId(null); setLoadDeletePhone(""); }}
                                className="px-1.5 py-1 bg-zinc-800 rounded text-[8px] text-zinc-400">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setLoadDeleteId(l.id)}
                              className="p-1 bg-zinc-800 border border-zinc-700 rounded active:scale-95 transition-all">
                              <Trash2 size={10} className="text-zinc-500"/>
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <Card className="bg-zinc-900 border-zinc-800 p-2.5">
            <div className="text-[8px] text-zinc-600 leading-relaxed">
              ℹ️ Community board — Truck owners खाली गाड़ी पोस्ट करते हैं · माल भेजने वाले load पोस्ट करते हैं। Listing 7 दिन में auto-expire। Deal से पहले rate verify करें।
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
