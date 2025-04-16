import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(helmet());
app.use(morgan(config.morgan.format));
app.use(express.json());

// Routes
app.use('/api', routes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Node.js Starter API' });
});

// Error handling
app.use(errorHandler);

export default app;