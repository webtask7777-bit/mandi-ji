import express from 'express';
import cors from 'cors';
import cropsRouter from './routes/crops.js';
import mandisRouter from './routes/mandis.js';
import pricesRouter from './routes/prices.js';
import districtsRouter from './routes/districts.js';
import weatherRouter from './routes/weather.js';
import statsRouter from './routes/stats.js';
import statesRouter from './routes/states.js';
import tickerRouter from './routes/ticker.js';
import mandiCompareRouter from './routes/mandi-compare.js';
import authRouter from './routes/auth.js';
import listingsRouter from './routes/listings.js';
import transportRouter from './routes/transport.js';
import transportBoardRouter from './routes/transport-board.js';
import loadBoardRouter from './routes/load-board.js';
import ewayBillRouter from './routes/eway-bill.js';
import adminRouter from './routes/admin.js';
import cmsRouter from './routes/cms.js';
import paymentsRouter, { webhookHandler } from './routes/payments.js';
import arbitrageRouter from './routes/arbitrage.js';

const app = express();
app.use(cors());

// Webhook MUST go before express.json() — needs raw body for HMAC verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json());

app.use('/api/crops', cropsRouter);
app.use('/api/mandis', mandisRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/districts', districtsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/stats', statsRouter);
app.use('/api/states', statesRouter);
app.use('/api/ticker', tickerRouter);
app.use('/api/mandi-compare', mandiCompareRouter);
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/transport', transportRouter);
app.use('/api/transport-board', transportBoardRouter);
app.use('/api/load-board', loadBoardRouter);
app.use('/api/eway-bill', ewayBillRouter);
app.use('/api/admin', adminRouter);
app.use('/api/cms', cmsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/arbitrage', arbitrageRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'MandiJi API' }));

if (!process.env.VERCEL) {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`🌾 MandiJi API running on http://localhost:${PORT}`);
  });
}

export default app;
