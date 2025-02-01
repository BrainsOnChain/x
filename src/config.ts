import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '../.env') });

// Validate required environment variables
const requiredEnvVars = [
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  'POSTING_INTERVAL_MIN',
  'POSTING_INTERVAL_MAX'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const minInterval = parseInt(process.env.POSTING_INTERVAL_MIN!, 10);
const maxInterval = parseInt(process.env.POSTING_INTERVAL_MAX!, 10);

if (isNaN(minInterval) || isNaN(maxInterval)) {
  throw new Error('POSTING_INTERVAL_MIN and POSTING_INTERVAL_MAX must be valid numbers');
}

if (minInterval >= maxInterval) {
  throw new Error('POSTING_INTERVAL_MIN must be less than POSTING_INTERVAL_MAX');
}

if (minInterval < 1) {
  throw new Error('POSTING_INTERVAL_MIN must be at least 1 minute');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    callbackUrl: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/twitter/callback',
  },
  posting: {
    minInterval,
    maxInterval,
  }
};
