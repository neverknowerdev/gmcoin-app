"use server";

export interface TweetResult {
    tweetContent: string;
    tweetID: string;
    userID: string;
    username: string;
    postedAt: string;
}

export async function searchTweetWithAuthCode(authCode: string): Promise<TweetResult[]> {
    // Calculate timestamp for 10 minutes ago in UTC
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const sinceDate = tenMinutesAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD in UTC

    // Build complete query string
    const query = `${authCode} since:${sinceDate}`;

    const twitterHost = process.env.TWITTER0_HOST;
    const twitterHeader = process.env.TWITTER0_HEADER;
    const twitterBearer = process.env.TWITTER0_BEARER;

    // Make request to Twitter API with time filter
    const response = await fetch(
        `https://${twitterHost}/Search?q=${encodeURIComponent(query)}&type=Latest&count=20&safe_search=false`,
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

export async function searchTweetByUrlOrUsername(input: string, authCode: string): Promise<TweetResult[]> {
    // Check if input is a tweet URL
    try {
        const tweetUrlMatch = input.match(/(x|twitter)\.com\/\w+\/status\/(\d+)/);
        if (tweetUrlMatch) {
            console.log('tweetId', tweetUrlMatch[2]);
            const tweetId = tweetUrlMatch[2]; // Fixed: using the second capture group for tweet ID
            const tweet = await getTweetById(tweetId);
            // Only return the tweet if it contains the auth code
            return tweet.tweetContent.includes(authCode) ? [tweet] : [];
        }

        // If not a URL, treat as username
        const username = input.startsWith('@') ? input.slice(1) : input;
        const userId = await getUserIdFromUsername(username);
        const tweets = await getUserTweets(userId);

        // Filter tweets to only include those with the auth code
        return tweets.filter(tweet => tweet.tweetContent.includes(authCode));
    } catch (error) {
        console.error('Error searching for tweet:', error);
        return [];
    }
}

async function getUserIdFromUsername(username: string): Promise<string> {
    const twitterHost = process.env.TWITTER0_HOST;
    const twitterHeader = process.env.TWITTER0_HEADER;
    const twitterBearer = process.env.TWITTER0_BEARER;

    const response = await fetch(
        `https://${twitterHost}/UsernameToUserId?username=${encodeURIComponent(username)}`,
        {
            headers: {
                [twitterHeader as string]: twitterBearer as string,
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get user ID: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id_str;
}

async function getUserTweets(userId: string): Promise<TweetResult[]> {
    const twitterHost = process.env.TWITTER0_HOST;
    const twitterHeader = process.env.TWITTER0_HEADER;
    const twitterBearer = process.env.TWITTER0_BEARER;

    const response = await fetch(
        `https://${twitterHost}/UserTweets?user_id=${encodeURIComponent(userId)}`,
        {
            headers: {
                [twitterHeader as string]: twitterBearer as string,
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get user tweets: ${response.statusText}`);
    }

    const data = await response.json();
    const instructions = data?.data?.user_result_by_rest_id?.result?.profile_timeline_v2?.timeline?.instructions || [];

    // Find all TimelineAddEntries instructions
    const addEntriesInstructions = instructions.filter((instruction: any) =>
        instruction.__typename === "TimelineAddEntries"
    );

    // Process all entries from all TimelineAddEntries instructions
    const allTweetEntries = addEntriesInstructions.flatMap((instruction: any) => {
        const entries = instruction.entries || [];
        return entries.filter((entry: any) =>
            entry.content?.__typename === "TimelineTimelineItem" &&
            entry.content?.content?.__typename === "TimelineTweet"
        );
    });

    return allTweetEntries.map((entry: any) => {
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
}

async function getTweetById(tweetId: string): Promise<TweetResult> {
    const twitterHost = process.env.TWITTER0_HOST;
    const twitterHeader = process.env.TWITTER0_HEADER;
    const twitterBearer = process.env.TWITTER0_BEARER;

    const response = await fetch(
        `https://${twitterHost}/TweetDetailv3?tweet_id=${encodeURIComponent(tweetId)}`,
        {
            headers: {
                [twitterHeader as string]: twitterBearer as string,
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get tweet: ${response.statusText}`);
    }

    const data = await response.json();
    const tweetData = data?.data?.tweet_results?.result;

    if (!tweetData) {
        throw new Error('Tweet not found');
    }

    const legacy = tweetData.legacy;
    const user = tweetData.core.user_results.result;

    return {
        tweetContent: legacy.full_text,
        tweetID: tweetData.rest_id,
        userID: user.rest_id,
        username: user.core.screen_name,
        postedAt: legacy.created_at
    };
}


