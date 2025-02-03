import { TwitterApi } from 'twitter-api-v2';

import prisma from '../lib/prisma.js';

interface TwitterConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes?: string[];
}

export class TwitterAuthManager {
  private client: TwitterApi;
  private readonly config: TwitterConfig;
  private tempStates: { [state: string]: { codeVerifier: string, expiresAt: number } } = {};

  constructor(config: TwitterConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || ['tweet.write', 'offline.access']
    };

    this.client = new TwitterApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret
    });
  }

  async handleCallback(state: string, code: string): Promise<void> {
    try {
      const stateData = this.tempStates[state];

      if (!stateData) {
        throw new Error('Invalid or expired state parameter');
      }

      const { codeVerifier } = stateData;

      // Exchange the code for access tokens
      const { accessToken, refreshToken, expiresIn } = await this.client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: this.config.callbackUrl
      });

      // Save tokens using Prisma
      await prisma.twitterTokens.upsert({
        where: { id: 1 }, // We only ever want one active token set
        create: {
          accessToken,
          refreshToken: refreshToken!,
          expiresAt: new Date(Date.now() + (expiresIn * 1000))
        },
        update: {
          accessToken,
          refreshToken: refreshToken!,
          expiresAt: new Date(Date.now() + (expiresIn * 1000))
        }
      });

      delete this.tempStates[state];
    } catch (error) {
      console.error('Error handling callback:', error);
      throw new Error('Failed to complete authentication');
    }
  }

  async createAuthenticatedClient(): Promise<TwitterApi> {
    try {
      const tokens = await prisma.twitterTokens.findFirst({
        orderBy: { updatedAt: 'desc' }
      });

      if (!tokens) {
        throw new Error('No stored tokens found');
      }

      // Check if token needs refresh
      if (new Date() >= tokens.expiresAt) {
        const { client: refreshedClient, accessToken, refreshToken, expiresIn } =
          await this.client.refreshOAuth2Token(tokens.refreshToken);

        // Save new tokens
        await prisma.twitterTokens.update({
          where: { id: tokens.id },
          data: {
            accessToken,
            refreshToken: refreshToken!,
            expiresAt: new Date(Date.now() + (expiresIn * 1000))
          }
        });

        return refreshedClient;
      }

      // Use existing token
      return new TwitterApi(tokens.accessToken);
    } catch (error) {
      console.error('Error creating authenticated client:', error);
      throw new Error('Failed to create authenticated client');
    }
  }

  async hasValidCredentials(): Promise<boolean> {
    try {
      const tokens = await prisma.twitterTokens.findFirst({
        orderBy: { updatedAt: 'desc' }
      });

      if (!tokens) return false;

      // Return true if we have a refresh token (we can always refresh)
      // or if the access token hasn't expired yet
      return Boolean(tokens.refreshToken) || new Date() < tokens.expiresAt;
    } catch {
      return false;
    }
  }

  async clearCredentials(): Promise<void> {
    await prisma.twitterTokens.deleteMany();
  }

  generateAuthUrl(): { url: string, state: string } {
    try {
      const { url, state, codeVerifier } = this.client.generateOAuth2AuthLink(
        this.config.callbackUrl,
        { scope: this.config.scopes }
      );

      this.tempStates[state] = {
        codeVerifier,
        expiresAt: Date.now() + 60 * 60 * 1000
      };

      return { url, state };
    } catch (error) {
      console.error('Error generating auth URL:', error);
      throw new Error('Failed to generate authentication URL');
    }
  }
}
