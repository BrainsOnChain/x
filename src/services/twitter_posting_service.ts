import { EventEmitter } from 'events';
import { TweetV2PostTweetResult, TwitterApi } from 'twitter-api-v2';

import { TwitterAuthManager } from './twitter_auth_manager.js';
import { config } from '../config.js';
import { NemaService } from './nema_service.js';
import prisma from '../lib/prisma.js';

export class TwitterPostingService extends EventEmitter {
  private authManager: TwitterAuthManager;
  private postTimeout: NodeJS.Timeout | null = null;
  private nemaService: NemaService;
  private lastState: string | null = null;

  constructor() {
    super();
    this.authManager = new TwitterAuthManager({
      clientId: config.twitter.clientId,
      clientSecret: config.twitter.clientSecret,
      callbackUrl: config.twitter.callbackUrl,
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
    });
    this.nemaService = new NemaService();
  }

  async initialize(): Promise<boolean> {
    return this.authManager.hasValidCredentials();
  }

  private getRandomInterval(): number {
    const { minInterval, maxInterval } = config.posting;
    return Math.floor(
      Math.random() * (maxInterval - minInterval + 1) + minInterval
    );
  }

  private async createNextSchedule(): Promise<string> {
    const intervalMinutes = this.getRandomInterval();
    const scheduledAt = new Date(Date.now() + intervalMinutes * 60 * 1000);

    const schedule = await prisma.postSchedule.create({
      data: { scheduledAt }
    });

    console.log(`Next tweet scheduled for: ${scheduledAt.toISOString()}`);
    return schedule.id;
  }

  private async storeTweet(
    tweetResponse: TweetV2PostTweetResult,
    content: string,
    scheduleId: string | null
  ): Promise<void> {
    const { data: tweet } = tweetResponse;

    await prisma.tweet.create({
      data: {
        id: tweet.id,
        content: content,
        postedAt: new Date(),
        rawResponse: JSON.stringify(tweetResponse),
        scheduleId: scheduleId
      }
    });
  }

  private async makePost(client: TwitterApi, scheduleId: string | null = null): Promise<void> {
    try {
      const content = await this.nemaService.generateContent();

      const tweetResponse = await client.v2.tweet(content);

      await this.storeTweet(tweetResponse, content, scheduleId);

      console.log('Tweet posted successfully:', content);

      // Create next schedule and set up timeout
      const nextScheduleId = await this.createNextSchedule();
      const nextSchedule = await prisma.postSchedule.findUnique({
        where: { id: nextScheduleId }
      });

      if (!nextSchedule) {
        throw new Error('Failed to create next schedule');
      }

      const delay = nextSchedule.scheduledAt.getTime() - Date.now();
      this.postTimeout = setTimeout(
        () => void this.makePost(client, nextSchedule.id),
        delay
      );

    } catch (error) {
      console.error('Error posting tweet:', error);
      // If posting failed, still try to schedule next post
      const nextScheduleId = await this.createNextSchedule();
      const nextSchedule = await prisma.postSchedule.findUnique({
        where: { id: nextScheduleId }
      });

      if (nextSchedule) {
        const delay = nextSchedule.scheduledAt.getTime() - Date.now();
        this.postTimeout = setTimeout(
          () => void this.makePost(client, nextSchedule.id),
          delay
        );
      }
    }
  }

  async startPosting(): Promise<void> {
    if (!await this.authManager.hasValidCredentials()) {
      throw new Error('Authentication required before starting the service');
    }

    const client = await this.authManager.createAuthenticatedClient();

    // Check if we already have a scheduled post
    const nextSchedule = await prisma.postSchedule.findFirst({
      where: {
        scheduledAt: { gt: new Date() },
        tweet: null
      },
      orderBy: { scheduledAt: 'asc' }
    });

    console.log('Next schedule:', nextSchedule);

    if (nextSchedule) {
      // Calculate delay until next scheduled post
      const delay = nextSchedule.scheduledAt.getTime() - Date.now();
      if (delay > 0) {
        console.log(`Resuming schedule. Next post at: ${nextSchedule.scheduledAt.toISOString()}`);
        this.postTimeout = setTimeout(
          () => void this.makePost(client, nextSchedule.id),
          delay
        );
        return;
      }
    }

    // No valid schedule exists, create first post without a schedule ID
    await this.makePost(client, null);
  }

  stopPosting(): void {
    if (this.postTimeout) {
      clearTimeout(this.postTimeout);
      this.postTimeout = null;
      console.log('Posting service stopped');
    }
  }

  async getAuthUrl(): Promise<string> {
    const { url, state } = await this.authManager.generateAuthUrl();
    this.lastState = state;
    return url;
  }

  async handleAuthCallback(state: string, code: string): Promise<void> {
    if (state !== this.lastState) {
      throw new Error('Invalid state parameter');
    }
    await this.authManager.handleCallback(state, code);
    this.lastState = null;
    this.emit('authenticated');
  }
}
