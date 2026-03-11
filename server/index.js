import express from 'express';
import cors from 'cors';
import cropsRouter from './routes/crops.js';
import mandisRouter from './routes/mandis.js';
import pricesRouter from './routes/prices.js';
import districtsRouter from './routes/districts.js';
import weatherRouter from './routes/weather.js';
import statsRouter from './routes/stats.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/crops', cropsRouter);
app.use('/api/mandis', mandisRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/districts', districtsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'MandiJi API' }));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🌾 MandiJi API running on http://localhost:${PORT}`);
});
