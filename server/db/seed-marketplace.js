import { readJSON, writeJSON } from './json-store.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const DEMO_USERS = [
  { name: 'किसान राम', phone: '9000000001', email: 'ram@demo.com', kycStatus: 'verified' },
  { name: 'सीता बाई', phone: '9000000002', email: 'sita@demo.com', kycStatus: 'verified' },
  { name: 'मोहन लाल', phone: '9000000003', email: 'mohan@demo.com', kycStatus: 'pending' },
  { name: 'गीता देवी', phone: '9000000004', email: 'geeta@demo.com', kycStatus: 'verified' },
  { name: 'अमर सिंह', phone: '9000000005', email: 'amar@demo.com', kycStatus: 'pending' },
];

const CROPS = [
  { name: 'गेहूँ', emoji: '🌾', nameEn: 'Wheat' },
  { name: 'चावल', emoji: '🍚', nameEn: 'Rice' },
  { name: 'सोयाबीन', emoji: '🫘', nameEn: 'Soybean' },
  { name: 'प्याज', emoji: '🧅', nameEn: 'Onion' },
  { name: 'टमाटर', emoji: '🍅', nameEn: 'Tomato' },
  { name: 'मक्का', emoji: '🌽', nameEn: 'Maize' },
  { name: 'चना', emoji: '🟤', nameEn: 'Gram' },
  { name: 'सरसों', emoji: '🌻', nameEn: 'Mustard' },
];

const MANDIS = [
  'रायपुर मंडी', 'भोपाल मंडी', 'इंदौर मंडी', 'बिलासपुर मंडी',
  'जबलपुर मंडी', 'दुर्ग मंडी', 'राजनांदगांव मंडी', 'कोरबा मंडी',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function seedMarketplace() {
  const existingUsers = readJSON('users.json');
  const passwordHash = await bcrypt.hash('demo1234', 10);

  // Create demo users (skip if phone already exists)
  const newUsers = [];
  for (const demo of DEMO_USERS) {
    if (existingUsers.some(u => u.phone === demo.phone)) continue;
    const user = {
      id: uuidv4(),
      name: demo.name,
      phone: demo.phone,
      email: demo.email,
      passwordHash,
      role: 'user',
      kycStatus: demo.kycStatus,
      kycDetails: demo.kycStatus === 'verified'
        ? { aadhaar: String(randomBetween(100000000000, 999999999999)), verifiedViaDigilocker: true }
        : {},
      status: 'active',
      createdAt: daysAgo(randomBetween(1, 30)),
    };
    newUsers.push(user);
  }

  if (newUsers.length > 0) {
    writeJSON('users.json', [...existingUsers, ...newUsers]);
  }

  const allUsers = readJSON('users.json');
  const demoUserIds = allUsers.filter(u => DEMO_USERS.some(d => d.phone === u.phone));

  // Create demo listings
  const existingListings = readJSON('listings.json');
  const newListings = [];

  for (let i = 0; i < 15; i++) {
    const user = randomFrom(demoUserIds.length > 0 ? demoUserIds : allUsers);
    const crop = randomFrom(CROPS);
    const type = Math.random() > 0.4 ? 'sell' : 'buy';
    const price = randomBetween(1500, 5000);
    const quantity = randomBetween(5, 200);
    const daysOld = randomBetween(0, 14);

    newListings.push({
      id: uuidv4(),
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      type,
      cropName: crop.name,
      cropEmoji: crop.emoji,
      quantity,
      unit: 'quintal',
      pricePerUnit: price,
      mandiName: randomFrom(MANDIS),
      description: type === 'sell'
        ? `${crop.name} की अच्छी क्वालिटी, ${quantity} क्विंटल उपलब्ध`
        : `${crop.name} खरीदना है, ${quantity} क्विंटल चाहिए`,
      status: 'active',
      createdAt: daysAgo(daysOld),
      expiresAt: new Date(Date.now() + (30 - daysOld) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  writeJSON('listings.json', [...existingListings, ...newListings]);

  // Create demo e-way bills
  const existingBills = readJSON('eway-bills.json');
  const newBills = [];
  const statuses = ['active', 'expired', 'cancelled'];

  for (let i = 0; i < 3; i++) {
    const user = randomFrom(demoUserIds.length > 0 ? demoUserIds : allUsers);
    const crop = randomFrom(CROPS);
    const status = statuses[i];
    const billNum = `MJ-2026-${String(existingBills.length + i + 1).padStart(5, '0')}`;

    newBills.push({
      id: uuidv4(),
      userId: user.id,
      billNumber: billNum,
      supplyType: 'outward',
      docNumber: `INV-${randomBetween(1000, 9999)}`,
      docDate: daysAgo(randomBetween(1, 10)).slice(0, 10),
      from: {
        name: user.name,
        gstin: '',
        address: `${randomFrom(MANDIS)}, छत्तीसगढ़`,
        state: 'छत्तीसगढ़',
        pincode: String(randomBetween(490001, 499999)),
      },
      to: {
        name: randomFrom(DEMO_USERS).name,
        gstin: '',
        address: `${randomFrom(MANDIS)}, मध्य प्रदेश`,
        state: 'मध्य प्रदेश',
        pincode: String(randomBetween(450001, 470000)),
      },
      items: [{
        cropName: crop.name,
        hsnCode: '1001',
        quantity: randomBetween(10, 100),
        unit: 'QTL',
        value: randomBetween(50000, 500000),
        cgst: 0, sgst: 0, igst: 0,
      }],
      transport: {
        mode: 'road',
        vehicleNumber: `CG${String(randomBetween(1, 20)).padStart(2, '0')}XX${randomBetween(1000, 9999)}`,
        distance: randomBetween(50, 500),
      },
      totalValue: randomBetween(50000, 500000),
      validFrom: daysAgo(5),
      validUntil: status === 'expired' ? daysAgo(1) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status,
      createdAt: daysAgo(randomBetween(1, 10)),
    });
  }

  writeJSON('eway-bills.json', [...existingBills, ...newBills]);

  return {
    usersAdded: newUsers.length,
    listingsAdded: newListings.length,
    billsAdded: newBills.length,
  };
}

// Allow running directly
if (process.argv[1] && process.argv[1].includes('seed-marketplace')) {
  seedMarketplace().then(result => {
    console.log('Seed complete:', result);
  });
}
