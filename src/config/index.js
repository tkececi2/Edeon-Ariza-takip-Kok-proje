import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  morgan: {
    format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
  }
};