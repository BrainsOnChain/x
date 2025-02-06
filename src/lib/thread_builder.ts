export class ThreadBuilder {
  private static readonly MAX_TWEET_LENGTH = 280;

  /**
   * Splits text into tweet-sized chunks, breaking at word boundaries
   */
  static splitIntoTweets(text: string): string[] {
    // Remove any existing arrays of more than 2 newlines
    const normalizedText = text.replace(/\n{3,}/g, '\n\n').trim();

    if (normalizedText.length <= this.MAX_TWEET_LENGTH) {
      return [normalizedText];
    }

    const tweets: string[] = [];
    let remainingText = normalizedText;

    while (remainingText.length > 0) {
      let endIndex = this.MAX_TWEET_LENGTH;

      // If remaining text is shorter than max length, use it all
      if (remainingText.length <= this.MAX_TWEET_LENGTH) {
        tweets.push(remainingText);
        break;
      }

      // Find the last word boundary before max length
      while (endIndex > 0 && !this.isWordBoundary(remainingText[endIndex])) {
        endIndex--;
      }

      // If we couldn't find a word boundary, force break at max length
      if (endIndex === 0) {
        endIndex = this.MAX_TWEET_LENGTH;
      }

      const tweet = remainingText.slice(0, endIndex).trim();
      tweets.push(tweet);
      remainingText = remainingText.slice(endIndex).trim();
    }

    return tweets;
  }

  /**
   * Checks if a character is a word boundary (whitespace or punctuation)
   */
  private static isWordBoundary(char: string): boolean {
    return /[\s.,!?;:'")\]}]/.test(char);
  }
}
