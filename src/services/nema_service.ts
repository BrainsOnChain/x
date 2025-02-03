import { config } from '../config.js';

interface NemaResponse {
  content: string;
  [key: string]: unknown; // For any additional fields the API might return
}

export class NemaService {
  private readonly baseUrl: string;
  private readonly authToken: string;

  constructor() {
    this.baseUrl = config.nema.baseUrl.replace(/\/$/, '');
    this.authToken = config.nema.authToken;
  }

  async generateContent(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/nema/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Nema API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as NemaResponse;

      return data.content;
    } catch (error) {
      console.error('Failed to generate content from Nema:', error);
      throw new Error('Failed to generate content');
    }
  }
}
