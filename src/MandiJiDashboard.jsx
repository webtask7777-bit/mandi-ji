import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ChevronDown, X, Search, MapPin, User, LogIn, Bell, Info, AlertTriangle, Gift, CheckCircle, ChartNoAxesCombined, CalendarDays, Store, Map, ShoppingBasket, Truck, ArrowRight, Globe } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApi } from "./hooks/useApi";
import { useStateContext } from "./context/StateContext";
import { useAuth } from "./context/AuthContext";
import { FALLBACK_CROPS, FALLBACK_REGIONS } from "./data/constants";
import { tabVariants } from "./utils/animations";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PricesTab from "./tabs/PricesTab";
import FloatingActionButton from "./components/marketplace/FloatingActionButton";
import SEO from "./components/SEO";
import Footer from "./components/Footer";
import LanguageEntry from "./components/LanguageEntry";
import Brand from "./components/Brand";
import { CropImageLegend } from "./components/CropImage";
import "./styles/dashboard.css";

// The map and marketplace should not delay the first price screen.
const CalendarTab = lazy(() => import('./tabs/CalendarTab'));
const MandisTab = lazy(() => import('./tabs/MandisTab'));
const NakshaTab = lazy(() => import('./tabs/NakshaTab'));
const BazaarTab = lazy(() => import('./tabs/BazaarTab'));
const DeliveryCalculatorTab = lazy(() => import('./tabs/DeliveryCalculatorTab'));
const brandCopy = text => typeof text === 'string' ? text.replace(/मंडीजी|\bMandiJi\b/g, 'सही भाव') : text;

const TAB_ITEMS = [
  { value: "prices", icon: ChartNoAxesCombined, label: "मंडी भाव" },
  { value: "delivery", icon: Truck, label: "डिलीवरी खर्च" },
  { value: "mandis", icon: Store, label: "मंडी" },
  { value: "calendar", icon: CalendarDays, label: "कैलेंडर" },
  { value: "naksha", icon: Map, label: "नक्शा" },
  { value: "bazaar", icon: ShoppingBasket, label: "बाज़ार" },
];

export default function MandiJiDashboard() {
  const selectedMonth = new Date().getMonth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'logistics' ? 'delivery' : TAB_ITEMS.some(tab => tab.value === requestedTab) ? requestedTab : 'prices';
  const [deliveryScenario, setDeliveryScenario] = useState(null);
  function setActiveTab(value) {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (value === 'prices') next.delete('tab');
      else next.set('tab', value);
      return next;
    });
  }
  function handleDeliveryCalculate(scenario = {}) {
    setDeliveryScenario({ ...scenario, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
    setActiveTab('delivery');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [jumpToCrop, setJumpToCrop] = useState(null);
  const [jumpToMandi, setJumpToMandi] = useState(null);
  const [dismissedBanners, setDismissedBanners] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  function handleCropClick(cropId) {
    setJumpToCrop(cropId);
    setActiveTab("prices");
  }
  function handleMandiClick(mandiName) {
    setJumpToMandi(mandiName);
    setActiveTab("mandis");
  }
  const searchRef = useRef(null);
  const stateDialogRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedState, selectStateDirect, stateNameHi, isCG, stateParam } = useStateContext();

  const stateQuery = stateParam !== "all" ? `?state=${stateParam}` : "?state=all";
  const { data: apiCrops, loading: cropsLoading, error: cropsError } = useApi(`/crops${stateQuery}`);
  const { data: apiMandis, loading: mandisLoading, error: mandisError } = useApi(`/mandis${stateQuery}`);
  const { data: apiDistricts, loading: districtsLoading, error: districtsError } = useApi(`/districts${stateQuery}`);
  const { data: apiHeatmap } = useApi(`/mandis/heatmap${stateQuery}`);
  const { data: apiStates, loading: statesLoading, error: statesError } = useApi('/states');
  const { data: banners } = useApi('/cms/banners');
  const { data: notifications } = useApi(`/cms/notifications${stateParam !== 'all' ? `?state=${stateParam}` : ''}`);

  const crops = apiCrops || FALLBACK_CROPS;
  const mandis = apiMandis || [];
  const districts = apiDistricts || [];
  const heatmap = apiHeatmap || {};
  const states = apiStates || [];

  // Keep the location picker usable with keyboard and screen readers.
  useEffect(() => {
    if (!showStatePicker) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 100);
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setShowStatePicker(false);
        setStateSearch("");
      }
      if (event.key !== "Tab") return;
      const items = stateDialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [showStatePicker]);

  useEffect(() => {
    if (!showUserMenu) return;
    function onKeyDown(event) {
      if (event.key === "Escape") setShowUserMenu(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showUserMenu]);

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
    <div className="sb-dashboard">
      <a href="#main-content" className="sb-skip-link">मुख्य जानकारी पर जाएँ</a>
      <SEO
        title={activeTab === 'calendar' ? 'किसान कैलेंडर — महीनेवार फसल योजना' : activeTab === 'delivery' ? 'डिलीवरी खर्च और माल की कुल लागत' : `${stateNameHi} मंडी भाव`}
        description={`${stateNameHi} की मंडियों के उपलब्ध दर्ज भाव। सब्ज़ी, अनाज, दाल — फसल भाव, मंडी तुलना और बिक्री कैलकुलेटर।`}
        path={selectedState ? `/mandi-bhav/${selectedState}` : "/"}
      />
      {/* Header */}
      <header className="sb-header">
        <div className="sb-header-inner">
          <div className="sb-header-row">
            <button className="sb-home-link" onClick={() => setActiveTab("prices")} aria-label="सही भाव — मंडी भाव होम">
              <Brand />
              <span className="sb-brand-caption">मंडी की जानकारी, एक जगह</span>
            </button>
            <div className="sb-header-spacer" />
            {/* State selector button */}
            <button
              onClick={() => setShowStatePicker(true)}
              className="sb-location-button"
              aria-label={`राज्य चुनें। अभी ${stateNameHi} चुना हुआ है`}
              aria-haspopup="dialog"
              aria-expanded={showStatePicker}
              aria-controls="state-picker-dialog"
            >
              <MapPin size={16} aria-hidden="true" />
              <span className="sb-location-name">
                {selectedState ? stateNameHi : "भारत"}
              </span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>
            <LanguageEntry />
            {/* Notification bell */}
            {notifications?.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(open => !open)}
                  className="sb-icon-button"
                  aria-label={`सूचनाएँ देखें, ${notifications.length} उपलब्ध`}
                  aria-expanded={showNotifications}
                  aria-controls="sb-notification-list"
                >
                  <Bell size={14} className="text-zinc-400" aria-hidden="true" />
                  <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>
                {showNotifications && (
                  <div id="sb-notification-list" role="region" aria-label="सूचनाएँ" className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
                    {notifications.map(item => (
                      <div key={item.id} className="rounded-lg px-2 py-2 text-left">
                        <div className="text-sm font-bold text-foreground">{brandCopy(item.title)}</div>
                        {item.message && <div className="text-xs text-zinc-400 mt-0.5">{brandCopy(item.message)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* User button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="sb-icon-button sb-account-button"
                  aria-label="मेरा खाता"
                  aria-expanded={showUserMenu}
                  aria-controls="account-menu"
                >
                  <User size={14} className="text-green-500" />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div id="account-menu" className="sb-account-menu absolute right-0 top-12 z-50 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-zinc-800">
                        <div className="flex items-center gap-1.5">
                          <div className="text-xs font-bold text-foreground truncate">{user.name}</div>
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
                className="sb-icon-button"
                aria-label="लॉग इन करें"
              >
                <LogIn size={14} className="text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        <nav className="sb-navigation" aria-label="मुख्य नेविगेशन">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="sb-tab-list" aria-label="डैशबोर्ड सेक्शन">
              {TAB_ITEMS.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value}
                    id={`tab-${tab.value}`} aria-controls={`panel-${tab.value}`}
                    className="sb-tab">
                    <Icon size={18} aria-hidden="true" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </nav>
      </header>

      {activeTab === "prices" && (
        <section className="sb-welcome" aria-labelledby="welcome-heading">
          <div className="sb-welcome-copy">
            <p className="sb-eyebrow"><span /> {stateNameHi} की मंडियों से</p>
            <h1 id="welcome-heading">भाव से आगे।<br /><span>पूरे सौदे का हिसाब।</span></h1>
            <p className="sb-welcome-description">मंडी का भाव देखें। फिर भाड़ा, खर्च और माल की कमी जोड़कर जानें—आपके यहाँ पहुँचने पर कितना पड़ेगा?</p>
            <div className="sb-welcome-actions">
              <button className="sb-primary-button" onClick={() => setShowStatePicker(true)}>
                <MapPin size={16} aria-hidden="true" /> अपना राज्य चुनें
              </button>
              <button className="sb-text-button" onClick={() => setActiveTab("delivery")}>
                डिलीवरी खर्च निकालें <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="sb-welcome-image" aria-hidden="true">
            <img src="/visuals/hero-harvest.webp" alt="" width="1280" height="853" fetchPriority="high" />
            <div className="sb-image-caption">खेत से मंडी तक, आपके साथ।</div>
          </div>
        </section>
      )}

      {activeTab === 'prices' && <nav className="sb-task-shortcuts" aria-label="अपना अगला कदम चुनें">
        <a href="#sb-crop-picker"><span className="sb-task-number">01</span><span><strong>फसल का भाव</strong><small>दर्ज तारीख के साथ</small></span><ChartNoAxesCombined size={20} aria-hidden="true" /></a>
        <button type="button" onClick={() => setActiveTab('mandis')}><span className="sb-task-number">02</span><span><strong>मंडी की जानकारी</strong><small>उपलब्ध रिकॉर्ड समझें</small></span><Store size={20} aria-hidden="true" /></button>
        <button type="button" onClick={() => setActiveTab('delivery')}><span className="sb-task-number">03</span><span><strong>पहुँचने तक की लागत</strong><small>वाहन, दूरी और बचत</small></span><Truck size={20} aria-hidden="true" /></button>
      </nav>}

      {/* Banners */}
      {banners?.filter(b => !dismissedBanners.includes(b.id) && (b.type !== 'promo' || activeTab === 'prices')).map(banner => {
        const colors = { info: 'bg-blue-500/10 border-blue-500/30 text-blue-400', warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400', promo: 'bg-green-500/10 border-green-500/30 text-green-400', success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
        const icons = { info: <Info size={12}/>, warning: <AlertTriangle size={12}/>, promo: <Gift size={12}/>, success: <CheckCircle size={12}/> };
        return (
          <div key={banner.id} className={`sb-cms-banner px-3 py-2 rounded-lg border flex items-center gap-2 ${colors[banner.type] || colors.info}`}>
            {icons[banner.type] || icons.info}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">{brandCopy(banner.title)}</div>
              <div className="text-xs opacity-80">{brandCopy(banner.message)}</div>
            </div>
            {/^https?:\/\//i.test(banner.link || '')
              ? <a href={banner.link} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold underline shrink-0">देखें</a>
              : banner.link?.startsWith('/') && <button type="button" onClick={() => navigate(banner.link)} className="text-[9px] font-bold underline shrink-0">देखें</button>}
            <button onClick={() => setDismissedBanners(prev => [...prev, banner.id])} className="sb-icon-button" aria-label="सूचना बंद करें"><X size={14}/></button>
          </div>
        );
      })}

      {/* Content */}
      <main id="main-content" className="sb-main" tabIndex={-1}>
        {activeTab !== "prices" && (
          <div className="sb-section-heading">
            <p className="sb-eyebrow">{stateNameHi} · सही भाव</p>
            <h1>{activeTab === 'calendar' ? 'किसान कैलेंडर' : TAB_ITEMS.find(tab => tab.value === activeTab)?.label}</h1>
          </div>
        )}
        <CropImageLegend />
        <AnimatePresence mode="wait">
          <Motion.div key={activeTab === 'delivery' || activeTab === 'naksha' ? activeTab : `${activeTab}-${stateParam}`} variants={tabVariants}
            id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className={`sb-tab-panel sb-panel-${activeTab}`}
            initial={typeof window === 'undefined' ? false : 'initial'} animate="animate" exit="exit"
            transition={{ duration: 0.15 }}>
            <Suspense fallback={<div role="status" className="py-12 text-center text-muted-foreground">जानकारी खुल रही है…</div>}>
            {activeTab === "prices" && <PricesTab crops={crops} stateParam={stateParam} initialCropId={jumpToCrop} onCropConsumed={() => setJumpToCrop(null)} onMandiClick={handleMandiClick} onDeliveryCalculate={handleDeliveryCalculate}/>}
            {activeTab === "calendar" && <CalendarTab crops={apiCrops || []} loading={cropsLoading} error={cropsError} stateName={stateNameHi} stateParam={stateParam} onCropClick={handleCropClick}/>}
            {activeTab === "mandis" && <MandisTab selectedMonth={selectedMonth} heatmap={heatmap} regions={isCG ? FALLBACK_REGIONS : null} stateParam={stateParam} onCropClick={handleCropClick} jumpToMandi={jumpToMandi} onMandiConsumed={() => setJumpToMandi(null)}/>}
            {activeTab === "naksha" && <NakshaTab key={stateParam} districts={districts} mandis={mandis} states={states} crops={cropsLoading ? [] : apiCrops || []} cropDataReady={!cropsLoading && Array.isArray(apiCrops)} loading={selectedState ? districtsLoading || mandisLoading : statesLoading} error={selectedState ? districtsError || mandisError : statesError} onDeliveryCalculate={handleDeliveryCalculate}/>}
            {activeTab === "bazaar" && <BazaarTab />}
            {activeTab === "delivery" && <DeliveryCalculatorTab crops={crops} initialScenario={deliveryScenario} onScenarioConsumed={() => setDeliveryScenario(null)} />}
            </Suspense>
          </Motion.div>
        </AnimatePresence>
        <nav className="sb-crop-directory" aria-label="राज्य के मंडी भाव"><h2>राज्य के अनुसार मंडी भाव</h2><div className="sb-crop-directory-links">{states.filter(state => state.hasData).map(state => <Link key={state.id} to={`/mandi-bhav/${state.id}`}>{state.nameHi || state.name}</Link>)}</div></nav>
        <Footer />
      </main>

      {/* Floating Action Button — visible when logged in */}
      <FloatingActionButton showFAB={!!user} />

      {/* ─── State Picker Bottom Sheet ─── */}
      <AnimatePresence>
        {showStatePicker && (
          <>
            {/* Backdrop */}
            <Motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="sb-dialog-backdrop fixed inset-0 z-40"
              onClick={() => { setShowStatePicker(false); setStateSearch(""); }}
            />
            {/* Sheet */}
            <Motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              ref={stateDialogRef}
              id="state-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="state-picker-heading"
              className="sb-state-picker fixed bottom-0 left-0 right-0 z-50 mx-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>

              {/* Header */}
              <div className="px-4 pb-3 flex items-center justify-between">
                <h2 id="state-picker-heading" className="text-lg font-bold text-foreground">अपना राज्य चुनें</h2>
                <button onClick={() => { setShowStatePicker(false); setStateSearch(""); }}
                  className="sb-icon-button" aria-label="राज्य चयन बंद करें">
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
                    aria-label="राज्य खोजें"
                    className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-zinc-600"
                  />
                  {stateSearch && (
                    <button onClick={() => setStateSearch("")} aria-label="खोज साफ करें" className="sb-clear-search">
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
                    <Globe size={17} aria-hidden="true" />
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
                      अभी डेटा उपलब्ध नहीं ({statesNoData.length})
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
            </Motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
