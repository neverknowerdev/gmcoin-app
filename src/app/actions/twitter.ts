"use server";

import { authedOnly } from "./auth";

export interface TweetResult {
    tweetContent: string;
    tweetID: string;
    userID: string;
    username: string;
    postedAt: string;
}

export async function searchTweetWithAuthCode(authCode: string): Promise<TweetResult[]> {
    // Verify JWT session
    await authedOnly();

    // Calculate timestamp for 10 minutes ago in UTC
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const sinceDate = tenMinutesAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD in UTC

    // Build complete query string
    const query = `${authCode} since:${sinceDate}`;

    console.log('query', query);

    const tweetSearchUrl = process.env.TWITTER_SEARCH_URL;
    const twitterHeader = process.env.TWITTER_HEADER;
    const twitterBearer = process.env.TWITTER_BEARER;

    // Make request to Twitter API with time filter
    const response = await fetch(
        `https://${tweetSearchUrl}?q=${encodeURIComponent(query)}&type=Latest&count=20&safe_search=false`,
        {
            headers: {
                [twitterHeader as string]: twitterBearer as string,
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Twitter API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if there are any tweets in the response
    const entries = data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions?.[0]?.entries || [];

    // Filter out cursor entries and process only tweet entries
    const tweetEntries = entries.filter((entry: any) =>
        entry.content?.__typename === "TimelineTimelineItem" &&
        entry.content?.content?.__typename === "TimelineTweet"
    );

    // Map the tweets to our desired format
    const tweets: TweetResult[] = tweetEntries.map((entry: any) => {
        const tweetData = entry.content.content.tweet_results.result;
        const legacy = tweetData.legacy;
        const user = tweetData.core.user_results.result;

        return {
            tweetContent: legacy.full_text,
            tweetID: tweetData.rest_id,
            userID: user.rest_id,
            username: user.core.screen_name,
            postedAt: legacy.created_at
        };
    });

    return tweets;
} 