import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Leaf, ChevronDown, X, Search, MapPin, User, LogIn, Crown, Bell, Info, AlertTriangle, Gift, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApi } from "./hooks/useApi";
import { useStateContext } from "./context/StateContext";
import { useAuth } from "./context/AuthContext";
import { MONTHS, FALLBACK_CROPS, FALLBACK_SEASONS, FALLBACK_REGIONS } from "./data/constants";
import { tabVariants } from "./utils/animations";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import CalendarTab from "./tabs/CalendarTab";
import MandisTab from "./tabs/MandisTab";
import PricesTab from "./tabs/PricesTab";
import NakshaTab from "./tabs/NakshaTab";
import BazaarTab from "./tabs/BazaarTab";
import LogisticsTab from "./tabs/LogisticsTab";
import FloatingActionButton from "./components/marketplace/FloatingActionButton";
import SEO from "./components/SEO";
import Footer from "./components/Footer";

const TAB_ITEMS = [
  { value: "prices", icon: "📊", label: "भाव" },
  { value: "calendar", icon: "📅", label: "कैलेंडर" },
  { value: "mandis", icon: "🏪", label: "मंडी" },
  { value: "naksha", icon: "🗺️", label: "नक्शा" },
  { value: "bazaar", icon: "🛒", label: "बाज़ार" },
  { value: "logistics", icon: "🚛", label: "ट्रांसपोर्ट" },
];

export default function MandiJiDashboard() {
  const selectedMonth = new Date().getMonth();
  const [activeTab, setActiveTab] = useState("prices");
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [jumpToCrop, setJumpToCrop] = useState(null);
  const [jumpToMandi, setJumpToMandi] = useState(null);
  const [dismissedBanners, setDismissedBanners] = useState([]);

  function handleCropClick(cropId) {
    setJumpToCrop(cropId);
    setActiveTab("prices");
  }
  function handleMandiClick(mandiName) {
    setJumpToMandi(mandiName);
    setActiveTab("mandis");
  }
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedState, setSelectedState, selectStateDirect, stateNameHi, isCG, stateParam } = useStateContext();

  const stateQuery = stateParam !== "all" ? `?state=${stateParam}` : "?state=all";
  const { data: apiCrops } = useApi(`/crops${stateQuery}`);
  const { data: apiMandis } = useApi(`/mandis${stateQuery}`);
  const { data: apiDistricts } = useApi(`/districts${stateQuery}`);
  const { data: apiHeatmap } = useApi(`/mandis/heatmap${stateQuery}`);
  const { data: apiStates } = useApi('/states');
  const { data: banners } = useApi('/cms/banners');
  const { data: notifications } = useApi(`/cms/notifications${stateParam !== 'all' ? `?state=${stateParam}` : ''}`);

  const crops = apiCrops || FALLBACK_CROPS;
  const seasons = FALLBACK_SEASONS;
  const mandis = apiMandis || [];
  const districts = apiDistricts || [];
  const heatmap = apiHeatmap || {};
  const states = apiStates || [];

  // Focus search when picker opens
  useEffect(() => {
    if (showStatePicker && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [showStatePicker]);

  // Filter states for picker
  const filteredStates = states.filter(s => {
    if (!stateSearch) return true;
    const q = stateSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.nameHi?.includes(stateSearch) || s.id?.includes(q);
  });

  // Separate states with data from without
  const statesWithData = filteredStates.filter(s => s.hasData !== false && s.totalRecords > 0);
  const statesNoData = filteredStates.filter(s => s.hasData === false || s.totalRecords === 0);

  function handleSelectState(stateId) {
    // Direct set (no toggle) — null = All India
    selectStateDirect(stateId);
    setShowStatePicker(false);
    setStateSearch("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground w-full max-w-lg mx-auto flex flex-col">
      <SEO
        title={`${stateNameHi} मंडी भाव`}
        description={`${stateNameHi} की मंडियों के ताज़ा भाव। सब्ज़ी, अनाज, दाल — सबके रोज़ाना भाव, मंडी तुलना, मुनाफ़ा कैलकुलेटर।`}
        path="/"
      />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-zinc-800">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
              <Leaf size={20} className="text-green-950" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-extrabold tracking-tight leading-none">
                मंडी<span className="text-amber-500">जी</span>
              </div>
              <div className="text-[10px] text-muted-foreground tracking-wider mt-0.5">
                {stateNameHi} मंडी डैशबोर्ड
              </div>
            </div>
            {/* State selector button */}
            <button
              onClick={() => setShowStatePicker(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-medium hover:border-zinc-500 active:scale-95 transition-all"
            >
              <span className="text-green-500">📍</span>
              <span className="truncate max-w-[80px]">
                {selectedState ? stateNameHi : "भारत"}
              </span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>
            {/* Pro button */}
            <button
              onClick={() => navigate('/pricing')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-400 hover:bg-amber-500/25 active:scale-95 transition-all"
            >
              <Crown size={11} />
              Pro
            </button>
            {/* Notification bell */}
            {notifications?.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => navigate('/blog')}
                  className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-500 active:scale-95 transition-all"
                >
                  <Bell size={14} className="text-zinc-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>
              </div>
            )}
            {/* User button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center active:scale-95 transition-all"
                >
                  <User size={14} className="text-green-500" />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-10 z-50 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-zinc-800">
                        <div className="flex items-center gap-1.5">
                          <div className="text-xs font-bold text-foreground truncate">{user.name}</div>
                          <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                            user.kycStatus === 'verified'
                              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {user.kycStatus === 'verified' ? 'KYC ✓' : 'KYC ✗'}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500">{user.phone}</div>
                      </div>
                      <button onClick={() => { setShowUserMenu(false); navigate('/my-listings'); }}
                        className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-zinc-800 transition-colors">
                        मेरी लिस्टिंग
                      </button>
                      <button onClick={() => { setShowUserMenu(false); navigate('/my-eway-bills'); }}
                        className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-zinc-800 transition-colors">
                        मेरे E-way Bills
                      </button>
                      {user.role === 'admin' && (
                        <button onClick={() => { setShowUserMenu(false); navigate('/admin'); }}
                          className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-zinc-800 transition-colors">
                          Admin Panel
                        </button>
                      )}
                      <button onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-zinc-800 transition-colors border-t border-zinc-800">
                        लॉग आउट
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-500 active:scale-95 transition-all"
              >
                <LogIn size={14} className="text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2">
          <div className="overflow-x-auto scrollbar-none">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-zinc-900 border border-zinc-800 h-9 p-0.5 flex min-w-max">
                {TAB_ITEMS.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value}
                    className="px-2.5 text-[10px] gap-1 h-full rounded-md whitespace-nowrap data-[state=active]:bg-green-500 data-[state=active]:text-green-950 data-[state=active]:font-bold data-[state=active]:shadow-none">
                    <span className="text-xs">{tab.icon}</span> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Banners */}
      {banners?.filter(b => !dismissedBanners.includes(b.id)).map(banner => {
        const colors = { info: 'bg-blue-500/10 border-blue-500/30 text-blue-400', warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400', promo: 'bg-green-500/10 border-green-500/30 text-green-400', success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
        const icons = { info: <Info size={12}/>, warning: <AlertTriangle size={12}/>, promo: <Gift size={12}/>, success: <CheckCircle size={12}/> };
        return (
          <div key={banner.id} className={`mx-4 mt-2 px-3 py-2 rounded-lg border flex items-center gap-2 ${colors[banner.type] || colors.info}`}>
            {icons[banner.type] || icons.info}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold">{banner.title}</div>
              <div className="text-[9px] opacity-80 truncate">{banner.message}</div>
            </div>
            {banner.link && <button onClick={() => navigate(banner.link)} className="text-[9px] font-bold underline shrink-0">देखें</button>}
            <button onClick={() => setDismissedBanners(prev => [...prev, banner.id])} className="opacity-50 hover:opacity-100"><X size={12}/></button>
          </div>
        );
      })}

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div key={`${activeTab}-${stateParam}`} variants={tabVariants}
            initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.15 }}>
            {activeTab === "prices" && <PricesTab crops={crops} stateParam={stateParam} initialCropId={jumpToCrop} onCropConsumed={() => setJumpToCrop(null)} onMandiClick={handleMandiClick}/>}
            {activeTab === "calendar" && <CalendarTab selectedMonth={selectedMonth} crops={crops} seasons={seasons} isCG={isCG}/>}
            {activeTab === "mandis" && <MandisTab selectedMonth={selectedMonth} heatmap={heatmap} regions={isCG ? FALLBACK_REGIONS : null} stateParam={stateParam} onCropClick={handleCropClick} jumpToMandi={jumpToMandi} onMandiConsumed={() => setJumpToMandi(null)}/>}
            {activeTab === "naksha" && <NakshaTab selectedMonth={selectedMonth} districts={districts} mandis={mandis} states={states} isCG={isCG} crops={crops}/>}
            {activeTab === "bazaar" && <BazaarTab />}
            {activeTab === "logistics" && <LogisticsTab />}
          </motion.div>
        </AnimatePresence>
        <Footer />
      </main>

      {/* Floating Action Button — visible when logged in */}
      <FloatingActionButton showFAB={!!user} />

      {/* ─── State Picker Bottom Sheet ─── */}
      <AnimatePresence>
        {showStatePicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => { setShowStatePicker(false); setStateSearch(""); }}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl max-w-lg mx-auto"
              style={{ maxHeight: "80vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>

              {/* Header */}
              <div className="px-4 pb-3 flex items-center justify-between">
                <div className="text-sm font-bold text-foreground">राज्य चुनें</div>
                <button onClick={() => { setShowStatePicker(false); setStateSearch(""); }}
                  className="p-1 rounded-full hover:bg-zinc-800 transition-colors">
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <Search size={14} className="text-muted-foreground shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={stateSearch}
                    onChange={e => setStateSearch(e.target.value)}
                    placeholder="राज्य खोजें..."
                    className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-zinc-600"
                  />
                  {stateSearch && (
                    <button onClick={() => setStateSearch("")}>
                      <X size={12} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* States List */}
              <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: "55vh" }}>
                {/* All India option */}
                <button
                  onClick={() => handleSelectState(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all active:scale-[0.98] ${
                    !selectedState ? "bg-green-500/15 border border-green-500/30" : "hover:bg-zinc-900"
                  }`}>
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm">🇮🇳</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className={`text-sm font-bold ${!selectedState ? "text-green-500" : "text-foreground"}`}>
                      भारत
                    </div>
                    <div className="text-[10px] text-muted-foreground">All India</div>
                  </div>
                  {!selectedState && (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>

                {/* States with data */}
                {statesWithData.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[9px] text-green-500 tracking-wider font-bold mb-1.5 px-1">
                      डेटा उपलब्ध ({statesWithData.length})
                    </div>
                    {statesWithData.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectState(s.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 transition-all active:scale-[0.98] ${
                          selectedState === s.id ? "bg-green-500/15 border border-green-500/30" : "hover:bg-zinc-900"
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          selectedState === s.id ? "bg-green-500/30" : "bg-zinc-800"
                        }`}>
                          <MapPin size={14} className={selectedState === s.id ? "text-green-500" : "text-zinc-500"} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className={`text-[12px] font-semibold truncate ${
                            selectedState === s.id ? "text-green-500" : "text-foreground"
                          }`}>
                            {s.nameHi}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {s.totalMandis} मंडी · {s.totalCrops} फसल · {s.totalRecords} रिकॉर्ड
                          </div>
                        </div>
                        {selectedState === s.id && (
                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* States without data */}
                {statesNoData.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[9px] text-zinc-500 tracking-wider font-bold mb-1.5 px-1">
                      डेटा जल्द आएगा ({statesNoData.length})
                    </div>
                    {statesNoData.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectState(s.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl mb-0.5 hover:bg-zinc-900 transition-all active:scale-[0.98] opacity-50">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                          <MapPin size={14} className="text-zinc-600" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-zinc-500 truncate">{s.nameHi}</div>
                          <div className="text-[9px] text-zinc-600">{s.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredStates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    कोई राज्य नहीं मिला
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
