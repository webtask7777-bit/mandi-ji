// Stored form of mandi-compare.json. A public row repeats its market's identity,
// three constants and several values derived from the dated quote; written out
// for ~77,000 rows that passed GitHub's 50 MB warning on its way to the 100 MB
// limit that would stop the twice-daily price push. So the file keeps each
// market once and each quote as one short array, and the loader rebuilds the
// exact public rows. Written by scripts/aggregate-india.cjs, read through
// server/db/connection.js; nothing else should open the file directly.

const FORMAT = 'mandi-compare/2';
const COMPARISON_IDENTITY = 'commodity-mandi-variety-grade-date-v1';

/** The one definition of a public comparison row; key order is the API's. */
function quoteRow(commodityId, market, quote) {
  const [marketId, name, district, state, stateId, stateCode] = market;
  const { topVariety, grade, totalRecords, date, quotePrice, count, min, max, recent } = quote;
  return {
    commodityId, marketId, name, district, state, stateId, stateCode,
    topVariety, grade, totalRecords,
    comparisonIdentity: COMPARISON_IDENTITY, unit: 'INR/quintal',
    quoteDate: date, lastDate: date, quotePrice, quoteRecords: count, records: count,
    priceBasis: 'daily-modal', recentPrice: recent ? quotePrice : null,
    // Retained for older display clients, always the exact dated quote above.
    avgPrice: quotePrice, minPrice: min, maxPrice: max, rangeBasis: recent ? 'recent' : 'historical',
  };
}

function encodeMandiCompare(compare) {
  const markets = [];
  const marketIndex = new Map();
  const crops = {};
  for (const [cropId, rows] of Object.entries(compare)) {
    crops[cropId] = rows.map(row => {
      // Keyed on the whole tuple: one marketId can carry two spellings of its name.
      const market = [row.marketId, row.name, row.district, row.state, row.stateId, row.stateCode];
      const key = JSON.stringify(market);
      if (!marketIndex.has(key)) { marketIndex.set(key, markets.length); markets.push(market); }
      return [marketIndex.get(key), row.topVariety, row.grade, row.totalRecords, row.quoteDate, row.quotePrice, row.quoteRecords, row.minPrice, row.maxPrice, row.recentPrice === null ? 0 : 1];
    });
  }
  return { format: FORMAT, markets, crops };
}

/** Files written before this format are already public rows and pass through. */
function decodeMandiCompare(stored) {
  if (stored?.format !== FORMAT) return stored;
  const compare = {};
  for (const [cropId, quotes] of Object.entries(stored.crops)) {
    compare[cropId] = quotes.map(([market, topVariety, grade, totalRecords, date, quotePrice, count, min, max, recent]) =>
      quoteRow(cropId, stored.markets[market], { topVariety, grade, totalRecords, date, quotePrice, count, min, max, recent: recent === 1 }));
  }
  return compare;
}

module.exports = { COMPARISON_IDENTITY, quoteRow, encodeMandiCompare, decodeMandiCompare };
