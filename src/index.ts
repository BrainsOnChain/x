import { startCallbackServer } from './server.js';
import { TwitterPoster } from './services/twitter_poster.js';

async function main() {
  try {
    console.log('Starting Twitter Automation Service...');

    const postingService = new TwitterPoster();

    // Start the callback server (needed for OAuth)
    const server = await startCallbackServer(postingService);

    // Initialize authentication if needed
    const needsAuth = !await postingService.initialize();
    if (needsAuth) {
      console.log('Authentication required. Please visit the following URL to authenticate:', await postingService.getAuthUrl());
      return;
    }

    // Start the posting loop
    await postingService.startPosting();
    console.log('Posting service started successfully');

    const shutdown = async () => {
      console.log('\nShutting down...');
      postingService.stopPosting();
      await new Promise(resolve => server.close(resolve));
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Start the application
main();
