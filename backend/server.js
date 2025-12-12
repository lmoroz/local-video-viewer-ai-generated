const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config'); // Используем единый конфиг
const apiRoutes = require('./src/routes/api');
const Timer = require('./src/utils/performance');

const app = express();

app.use(cors());
app.use(express.json());

// Middleware профилирующего таймера
app.use((req, res, next) => {
  const timer = new Timer(`${ req.method } ${ req.url }`);
  res.on('finish', () => {
    timer.end();
  });
  next();
});

app.use('/api', apiRoutes);

const frontendPath = path.join(__dirname, 'frontend-dist');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({error: 'API endpoint not found'});

  if (require('fs').existsSync(path.join(frontendPath, 'index.html'))) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
  else {
    res.status(404).send('Frontend not found.');
  }
});

app.listen(config.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${ config.PORT }`);
});
