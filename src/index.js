import app from './app.js';
import { config } from './config/index.js';

app.listen(config.port, () => {
  console.log(`Server is running in ${config.env} mode on port ${config.port}`);
});