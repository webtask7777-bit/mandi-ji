import { createContext, useContext, useState, useCallback } from "react";

const StateContext = createContext(null);

const STATE_NAMES = {
  // States
  "andhra-pradesh": "आन्ध्र प्रदेश",
  "arunachal-pradesh": "अरुणाचल प्रदेश",
  "assam": "असम",
  "bihar": "बिहार",
  "chhattisgarh": "छत्तीसगढ़",
  "goa": "गोवा",
  "gujarat": "गुजरात",
  "haryana": "हरियाणा",
  "himachal-pradesh": "हिमाचल प्रदेश",
  "jharkhand": "झारखण्ड",
  "karnataka": "कर्नाटक",
  "kerala": "केरल",
  "madhya-pradesh": "मध्य प्रदेश",
  "maharashtra": "महाराष्ट्र",
  "manipur": "मणिपुर",
  "meghalaya": "मेघालय",
  "mizoram": "मिज़ोरम",
  "nagaland": "नागालैंड",
  "odisha": "ओडिशा",
  "punjab": "पंजाब",
  "rajasthan": "राजस्थान",
  "sikkim": "सिक्किम",
  "tamil-nadu": "तमिल नाडु",
  "telangana": "तेलंगाना",
  "tripura": "त्रिपुरा",
  "uttar-pradesh": "उत्तर प्रदेश",
  "uttarakhand": "उत्तराखण्ड",
  "west-bengal": "पश्चिम बंगाल",
  // UTs
  "andaman-nicobar": "अंडमान निकोबार",
  "chandigarh": "चंडीगढ़",
  "dadra-daman": "दादरा एवं दमन",
  "dadra-nagar-haveli": "दादरा नगर हवेली",
  "daman-diu": "दमन और दीव",
  "delhi": "दिल्ली",
  "jammu-kashmir": "जम्मू-कश्मीर",
  "ladakh": "लद्दाख",
  "lakshadweep": "लक्षद्वीप",
  "puducherry": "पुदुचेरी",
};

export function StateProvider({ children }) {
  const [selectedState, setSelectedState] = useState(null); // null = All India

  const stateNameHi = selectedState
    ? (STATE_NAMES[selectedState] || selectedState)
    : "भारत";

  const isCG = selectedState === "chhattisgarh";
  const stateParam = selectedState || "all";

  const selectState = useCallback((id) => {
    setSelectedState(id === selectedState ? null : id);
  }, [selectedState]);

  // Direct set (no toggle) — used by dropdown picker
  const selectStateDirect = useCallback((id) => {
    setSelectedState(id);
  }, []);

  return (
    <StateContext.Provider value={{
      selectedState,
      setSelectedState: selectState,
      selectStateDirect,
      stateNameHi,
      isCG,
      stateParam,
    }}>
      {children}
    </StateContext.Provider>
  );
}

export function useStateContext() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useStateContext must be used within StateProvider");
  return ctx;
}
