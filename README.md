# Node.js Starter Project

A modular Node.js project setup with Express.

## Features

- Modular project structure
- Express server with middleware
- CORS support
- Security headers with Helmet
- Request logging with Morgan
- Environment variables with dotenv
- Hot reloading with nodemon
- Health check endpoints

## Project Structure

```
src/
  ├── config/        # Configuration files
  ├── controllers/   # Route controllers
  ├── middleware/    # Custom middleware
  ├── routes/        # API routes
  ├── app.js         # Express app setup
  └── index.js       # Application entry point
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. For production:
```bash
npm start
```

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Basic health check
- `GET /api/health/details` - Detailed health information

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```