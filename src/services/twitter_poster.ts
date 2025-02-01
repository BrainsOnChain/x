import { TwitterAuthManager } from './twitter_auth_manager';
import { config } from '../config';
import TwitterApi from 'twitter-api-v2';

export class TwitterPoster {
  private authManager: TwitterAuthManager;
  private postInterval: NodeJS.Timeout | null = null;
  private lastState: string | null = null;

  constructor() {
    this.authManager = new TwitterAuthManager({
      clientId: config.twitter.clientId,
      clientSecret: config.twitter.clientSecret,
      callbackUrl: config.twitter.callbackUrl,
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
    });
  }

  private getRandomInterval(): number {
    const { minInterval, maxInterval } = config.posting;
    return Math.floor(
      Math.random() * (maxInterval - minInterval + 1) + minInterval
    );
  }

  private async scheduleNextPost(client: TwitterApi) {
    const intervalMinutes = this.getRandomInterval();
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`Next tweet scheduled in ${intervalMinutes} minutes`);

    this.postInterval = setTimeout(async () => {
      try {
        const content = `Automated tweet at ${new Date().toISOString()}`;
        await client.v2.tweet(content);
        console.log('Tweet posted successfully:', content);

        // Schedule the next post with a new random interval
        await this.scheduleNextPost(client);
      } catch (error) {
        console.error('Error posting tweet:', error);
        // Still try to schedule next post even if this one failed
        await this.scheduleNextPost(client);
      }
    }, intervalMs);
  }

  async initialize(): Promise<boolean> {
    if (!await this.authManager.hasValidCredentials()) {
      const { url, state } = await this.authManager.generateAuthUrl();
      this.lastState = state;
      console.log('Please visit this URL to authenticate:', url);
      return false;
    }
    return true;
  }

  async handleAuthCallback(state: string, code: string): Promise<void> {
    if (state !== this.lastState) {
      throw new Error('Invalid state parameter');
    }
    await this.authManager.handleCallback(state, code);
    this.lastState = null;
  }

  async startPosting() {
    if (!await this.authManager.hasValidCredentials()) {
      throw new Error('Authentication required before starting the service');
    }

    const client = await this.authManager.createAuthenticatedClient();

    // Stop any existing interval
    this.stopPosting();

    // Post first tweet immediately
    try {
      const content = `Service started! First tweet at ${new Date().toISOString()}`;
      await client.v2.tweet(content);
      console.log('Initial tweet posted successfully');

      // Schedule the next post
      await this.scheduleNextPost(client);
    } catch (error) {
      console.error('Error posting initial tweet:', error);
      // Still try to schedule first post even if initial tweet failed
      await this.scheduleNextPost(client);
    }
  }

  stopPosting() {
    if (this.postInterval) {
      clearTimeout(this.postInterval);
      this.postInterval = null;
      console.log('Posting service stopped');
    }
  }
}
