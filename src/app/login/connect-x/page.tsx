"use client";

import { useProfiles, useActiveAccount, useLinkProfile } from "thirdweb/react";
import { client } from "../../../lib/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AccountButton from "../../../components/AccountButton";
import { generateAuthCode } from "../../../utils/authCode";
import { searchTweetWithAuthCode } from "../../../app/actions/twitter";
import type { TweetResult } from "../../../app/actions/twitter";

export default function ConnectX() {
  const router = useRouter();
  const { data: profiles, isLoading, error } = useProfiles({ client });
  const [authCode, setAuthCode] = useState<string | null>(null);
  const account = useActiveAccount();
  const {
    mutate: linkProfile,
    data: linkProfileData,
    error: linkProfileError,
    isPending: isLinkingProfile,
    isSuccess: isLinkProfileSuccess,
    isError: isLinkProfileError,
    reset: resetLinkProfile
  } = useLinkProfile();
  const [xAccountAlreadyLinked, setXAccountAlreadyLinked] = useState(false);
  const [isConfirmingTweet, setIsConfirmingTweet] = useState(false);
  const [isUserTweeted, setIsUserTweeted] = useState(false);
  const [isSearchingTweet, setIsSearchingTweet] = useState(false);
  const [foundTweet, setFoundTweet] = useState<TweetResult | null>(null);
  const [isConfirmingUsername, setIsConfirmingUsername] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    if (profiles) {
      const xProfile = profiles.find(profile => profile.type === "x");
      if (xProfile) {
        console.log('found X profile, redirecting to send-transaction');
        router.push('/login/send-transaction');
      }
    }
  }, [profiles, router]);

  useEffect(() => {
    if (account?.address) {
      const code = generateAuthCode(account.address);
      setAuthCode(code);
    }
  }, [account]);

  const pollForTweet = async (maxAttempts: number = 5) => {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const tweets = await searchTweetWithAuthCode(authCode || '');
        if (tweets.length > 0) {
          // Get the earliest tweet
          const earliestTweet = tweets.reduce((earliest, current) => {
            return new Date(current.postedAt) < new Date(earliest.postedAt) ? current : earliest;
          });

          setFoundTweet(earliestTweet);
          setIsSearchingTweet(false);
          setIsConfirmingUsername(true);
          return true;
        }
      } catch (error) {
        console.error('Error searching for tweet:', error);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
    }

    setIsSearchingTweet(false);
    setIsTimeout(true);
    return false;
  };

  const handleOnUserTweeted = () => {
    setIsUserTweeted(true);
    setIsTimeout(false);
    setIsSearchingTweet(true);
    pollForTweet();
  };

  const handleRetrySearch = () => {
    setIsTimeout(false);
    setIsUserTweeted(true);
    setIsSearchingTweet(true);
    pollForTweet();
  };

  const handleTryAgain = () => {
    setIsTimeout(false);
    setIsUserTweeted(false);
    setFoundTweet(null);
  };

  const handleXSignIn = () => {
    console.log('Starting X sign in process...');
    linkProfile({
      client,
      strategy: "x",
    }, {
      onSuccess: (data) => {
        router.push('/login/send-transaction');
        console.log('X sign in successful:', data);
      },
      onError: (error) => {
        console.error('X sign in failed:', error);
        console.log('Error message:', error.message);

        if (error.message === "This profile is already linked to another wallet") {
          setXAccountAlreadyLinked(true);
        }
      }
    });
  };

  const handleShareOnX = () => {
    if (!authCode) return;

    const tweetText = encodeURIComponent(`I'm going to GM a lot..\n\n${authCode}`);
    const intentUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

    // Show the confirmation popup
    setIsConfirmingTweet(true);

    // Open the intent window
    window.open(intentUrl, '_blank');
  };

  const handleUsernameConfirm = () => {
    // TODO: Handle username confirmation
    setIsConfirmingUsername(false);

    localStorage.setItem('authCode', authCode || '');
    localStorage.setItem('xUsername', foundTweet?.username || '');
    localStorage.setItem('xUserID', foundTweet?.userID || '');
    localStorage.setItem('xTweetID', foundTweet?.tweetID || '');

    router.push('/login/send-transaction');
    // Proceed with the next step
  };

  const handleUsernameReject = () => {
    setFoundTweet(null);
    setIsConfirmingUsername(false);
    setIsUserTweeted(false);
    // Maybe show a message to try again
  };

  return (
    <div className="min-h-screen w-full">
      {/* Top navigation bar with AccountButton */}
      <div className="w-full flex justify-end p-4">
        <AccountButton />
      </div>

      {/* Main content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-2xl font-bold mb-4">Connect X</h1>
            {!isConfirmingTweet && !isUserTweeted && (
              <div>
                {authCode ? (
                  <div className="space-y-4">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="font-mono text-lg">{authCode}</p>
                    </div>
                    <button
                      onClick={handleShareOnX}
                      className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center space-x-2 mx-auto"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span>Share on X</span>
                    </button>
                  </div>
                ) : (
                  <p>Please connect your wallet to generate auth code</p>
                )}
              </div>
            )}
          </div>

          {/* OAuth Login Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">OAuth Login</h2>
            <button
              onClick={handleXSignIn}
              disabled={isLinkingProfile}
              className={`bg-black hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center space-x-2 ${isLinkingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>{isLinkingProfile ? 'Signing in...' : 'Sign in with X'}</span>
            </button>
            {isLinkProfileError && (
              <p className="text-red-500 mt-2">Error signing in with X. Please try again.</p>
            )}
            {xAccountAlreadyLinked && (
              <p className="text-red-500 mt-2">This X account is already used for different wallet. Try to logout and login using this X account. Or use authCode verification method</p>
            )}
          </div>
        </div>

        {/* Tweet Confirmation Popup */}
        {isConfirmingTweet && (
          <div className="fixed inset-0 bg-[#ffffff] flex items-center justify-center">
            <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1DA1F2]"></div>
              <p className="text-lg font-medium">Waiting for your tweet...</p>
              <button
                onClick={handleOnUserTweeted}
                className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold py-2 px-6 rounded-lg"
              >
                I've tweeted!
              </button>
            </div>
          </div>
        )}

        {/* Tweet Search Popup */}
        {isSearchingTweet && (
          <div className="fixed inset-0 bg-[#ffffff] flex items-center justify-center">
            <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1DA1F2]"></div>
              <p className="text-lg font-medium">Looking for your tweet...</p>
            </div>
          </div>
        )}

        {/* Username Confirmation Popup */}
        {isConfirmingUsername && foundTweet && (
          <div className="fixed inset-0 bg-[#ffffff] flex items-center justify-center">
            <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
              <p className="text-lg font-medium">Is this your X username?</p>
              <p className="text-xl font-bold text-[#1DA1F2]">@{foundTweet.username}</p>
              <div className="flex space-x-4">
                <button
                  onClick={handleUsernameConfirm}
                  className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold py-2 px-6 rounded-lg"
                >
                  Yes, that's me
                </button>
                <button
                  onClick={handleUsernameReject}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg"
                >
                  No, try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeout Popup */}
        {isTimeout && (
          <div className="fixed inset-0 bg-[#ffffff] flex items-center justify-center">
            <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
              <p className="text-lg font-medium">Cannot find your tweet...</p>
              <div className="flex space-x-4">
                <button
                  onClick={handleRetrySearch}
                  className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold py-2 px-6 rounded-lg"
                >
                  Find it now!
                </button>
                <button
                  onClick={handleTryAgain}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 