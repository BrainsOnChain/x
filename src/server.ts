import express from 'express';
import { Server } from 'http';

import { config } from './config';
import { TwitterPoster } from './services/twitter_posting_service';

export async function startCallbackServer(postingService: TwitterPoster): Promise<Server> {
  const app = express();

  app.get('/', (req, res) => {
    res.send('Twitter Automation Service');
  });

  app.get('/twitter/callback', async (req, res) => {
    const { state, code } = req.query;

    if (!state || !code) {
      return res.status(400).send('Missing required parameters');
    }

    try {
      await postingService.handleAuthCallback(state as string, code as string);
      res.send('Authentication successful! You can close this window.');
    } catch (error) {
      console.error('Auth error:', error);
      res.status(400).send('Authentication failed');
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(config.port, () => {
      console.log(`Auth callback server running at http://localhost:${config.port}`);
      resolve(server);
    });
  });
}
