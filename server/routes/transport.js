import { Router } from 'express';

const router = Router();

// Vehicle data
const VEHICLES = {
  tractor: { base: 500, perKm: 15, cap: 30, speed: 25, name: 'ट्रैक्टर ट्रॉली' },
  pickup: { base: 500, perKm: 12, cap: 20, speed: 40, name: 'पिकअप' },
  'truck-small': { base: 1000, perKm: 20, cap: 70, speed: 35, name: 'छोटा ट्रक' },
  'truck-large': { base: 1500, perKm: 25, cap: 160, speed: 30, name: 'बड़ा ट्रक' },
  trailer: { base: 2000, perKm: 30, cap: 250, speed: 28, name: 'ट्रेलर' },
};

// Major Indian city coordinates [lat, lng]
const CITY_COORDS = {
  // Punjab & Haryana
  'kapurthala': [31.38, 75.38], 'ludhiana': [30.90, 75.85], 'amritsar': [31.63, 74.87],
  'jalandhar': [31.33, 75.57], 'patiala': [30.34, 76.39], 'bathinda': [30.21, 74.95],
  'chandigarh': [30.74, 76.79], 'ambala': [30.38, 76.78], 'karnal': [29.69, 76.99],
  'gurugram': [28.46, 77.03], 'faridabad': [28.41, 77.31], 'hisar': [29.15, 75.72],
  // UP & Delhi
  'delhi': [28.70, 77.10], 'noida': [28.54, 77.39], 'ghaziabad': [28.67, 77.45],
  'agra': [27.18, 78.01], 'lucknow': [26.85, 80.95], 'kanpur': [26.44, 80.33],
  'varanasi': [25.32, 83.01], 'allahabad': [25.44, 81.84], 'meerut': [28.98, 77.71],
  'mathura': [27.49, 77.67], 'bareilly': [28.36, 79.41], 'aligarh': [27.88, 78.08],
  // Rajasthan
  'jaipur': [26.91, 75.79], 'jodhpur': [26.30, 73.02], 'udaipur': [24.57, 73.69],
  'ajmer': [26.45, 74.64], 'kota': [25.18, 75.84], 'bikaner': [28.01, 73.31],
  // Gujarat
  'ahmedabad': [23.02, 72.57], 'surat': [21.17, 72.83], 'vadodara': [22.31, 73.19],
  'rajkot': [22.30, 70.80], 'bhavnagar': [21.77, 72.14], 'gandhinagar': [23.22, 72.64],
  // Maharashtra
  'mumbai': [19.08, 72.88], 'pune': [18.52, 73.86], 'nagpur': [21.15, 79.09],
  'nashik': [19.99, 73.79], 'aurangabad': [19.88, 75.34], 'solapur': [17.68, 75.90],
  'kolhapur': [16.70, 74.24], 'navi mumbai': [19.04, 73.03], 'thane': [19.22, 72.98],
  // MP & CG
  'bhopal': [23.26, 77.41], 'indore': [22.72, 75.86], 'jabalpur': [23.18, 79.94],
  'gwalior': [26.22, 78.18], 'ujjain': [23.18, 75.78], 'raipur': [21.25, 81.63],
  'bhilai': [21.21, 81.43], 'bilaspur': [22.09, 82.14], 'durg': [21.19, 81.28],
  // Karnataka
  'bangalore': [12.97, 77.59], 'bengaluru': [12.97, 77.59], 'mysore': [12.30, 76.65],
  'hubli': [15.35, 75.14], 'dharwad': [15.46, 75.01], 'mangalore': [12.87, 74.88],
  'belgaum': [15.85, 74.50], 'gulbarga': [17.33, 76.82],
  // Tamil Nadu
  'chennai': [13.08, 80.27], 'coimbatore': [11.02, 76.97], 'madurai': [9.93, 78.12],
  'tiruchirappalli': [10.79, 78.70], 'salem': [11.66, 78.15], 'tirunelveli': [8.73, 77.70],
  'erode': [11.34, 77.73], 'vellore': [12.92, 79.13],
  // Kerala
  'thiruvananthapuram': [8.52, 76.94], 'kochi': [9.93, 76.26], 'kozhikode': [11.25, 75.78],
  'thrissur': [10.52, 76.21], 'kollam': [8.89, 76.61], 'munnar': [10.09, 77.06],
  'ernakulam': [9.98, 76.29], 'chalakudy': [10.30, 76.34], 'palakkad': [10.78, 76.65],
  // Telangana & AP
  'hyderabad': [17.38, 78.49], 'secunderabad': [17.44, 78.50], 'warangal': [17.97, 79.60],
  'vijayawada': [16.50, 80.62], 'visakhapatnam': [17.69, 83.22], 'guntur': [16.31, 80.44],
  // West Bengal & East
  'kolkata': [22.57, 88.36], 'howrah': [22.59, 88.31], 'siliguri': [26.71, 88.43],
  'asansol': [23.67, 86.98], 'durgapur': [23.48, 87.32], 'patna': [25.61, 85.14],
  'gaya': [24.79, 85.00], 'ranchi': [23.34, 85.31], 'jamshedpur': [22.80, 86.18],
  'bhubaneswar': [20.30, 85.84], 'cuttack': [20.46, 85.88], 'guwahati': [26.14, 91.74],
  // Others
  'dehradun': [30.32, 78.03], 'haridwar': [29.94, 78.17], 'shimla': [31.10, 77.17],
  'jammu': [32.73, 74.87], 'srinagar': [34.09, 74.80], 'leh': [34.16, 77.58],
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35); // ×1.35 road factor
}

function getCoords(cityName) {
  if (!cityName) return null;
  const key = cityName.toLowerCase().trim().replace(/[^a-z\s]/g, '');
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // Try partial match
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function calcDistance(origin, destination) {
  const cA = getCoords(origin);
  const cB = getCoords(destination);
  if (cA && cB) return Math.max(50, haversineKm(cA[0], cA[1], cB[0], cB[1]));
  // Fallback: same city
  if (origin.toLowerCase().trim() === destination.toLowerCase().trim()) return 50;
  return 500; // unknown city fallback
}

// POST /api/transport/calculate
router.post('/calculate', (req, res) => {
  try {
    const { origin, destination, weightQuintals, vehicleType } = req.body;

    if (!origin || !destination || !weightQuintals || !vehicleType) {
      return res.status(400).json({ error: 'सभी फ़ील्ड आवश्यक हैं' });
    }

    const vehicle = VEHICLES[vehicleType];
    if (!vehicle) {
      return res.status(400).json({ error: 'अमान्य वाहन प्रकार' });
    }

    const weight = Number(weightQuintals);
    if (weight <= 0) {
      return res.status(400).json({ error: 'मात्रा 0 से अधिक होनी चाहिए' });
    }

    const distance = calcDistance(origin, destination);
    const trips = Math.ceil(weight / vehicle.cap);
    const baseCost = vehicle.base * trips;
    const distanceCost = distance * vehicle.perKm * trips;
    const loadingCost = weight * 5;
    const tollEstimate = Math.round(distance * 0.5);
    const totalCost = baseCost + distanceCost + loadingCost + tollEstimate;
    const costPerQuintal = Math.round(totalCost / weight);
    const estimatedHours = Math.round((distance / vehicle.speed) * trips * 10) / 10;

    res.json({
      distance,
      baseCost,
      distanceCost,
      loadingCost,
      tollEstimate,
      totalCost,
      estimatedTime: estimatedHours,
      trips,
      costPerQuintal,
      vehicleName: vehicle.name,
      vehicleCapacity: vehicle.cap,
    });
  } catch (err) {
    res.status(500).json({ error: 'कैलकुलेशन विफल' });
  }
});

export default router;
