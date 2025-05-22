"use client";

import { useProfiles, useActiveAccount, useLinkProfile } from "thirdweb/react";
import { client } from "../../../lib/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import AccountButton from "../../../components/AccountButton";
import { generateAuthCode } from "../../../utils/authCode";
import { searchTweetWithAuthCode } from "../../../app/actions/twitter";
import type { TweetResult } from "../../../app/actions/twitter";
import styles from "./page.module.css";
import Modal from "../../../components/ui/modal/Modal";

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

  const [tweetModalOpened, setTweetModalOpened] = useState(false);

  const [xAccountAlreadyLinked, setXAccountAlreadyLinked] = useState(false);
  const [verificationSection, setVerificationSection] = useState<"tweetToVerify" | "oauth">("tweetToVerify");
  const [displayITweetedButton, setDisplayITweetedButton] = useState(false);

  const [isConfirmingTweet, setIsConfirmingTweet] = useState(false);
  const [isUserTweeted, setIsUserTweeted] = useState(false);
  const [isSearchingTweet, setIsSearchingTweet] = useState(false);
  const isSearchingRef = useRef(isSearchingTweet);
  const [foundTweet, setFoundTweet] = useState<TweetResult | null>(null);
  const [isConfirmingUsername, setIsConfirmingUsername] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  const [currentTweetIndex, setCurrentTweetIndex] = useState(0);

  const tweetTexts = [
    "GM to everyone! I'm verifying my wallet with GMCoin",
    "Just joined the GMCoin community! Verifying my wallet",
    "Excited to be part of GMCoin! Verifying my wallet",
    "GMCoin verification in progress!",
    "Ready to GM with GMCoin! Verifying my wallet",
    "Joining the GMCoin revolution! Wallet verification",
    "GMCoin here I come! Verifying my wallet",
    "Another day, another GM! Verifying my GMCoin wallet",
    "GMCoin verification time!",
    "Let's GM together! Verifying my GMCoin wallet"
  ];

  const getCurrentTweetText = () => {
    if (!authCode) return "";
    return `${tweetTexts[currentTweetIndex]}\n\n${authCode} 🚀`;
  };

  const handleRefreshTweet = () => {
    setCurrentTweetIndex((prevIndex) => (prevIndex + 1) % tweetTexts.length);
  };

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

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 20 - 10;
      const y = (e.clientY / window.innerHeight) * 20 - 10;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    isSearchingRef.current = isSearchingTweet;
  }, [isSearchingTweet]);

  useEffect(() => {
    if (!isSearchingTweet) return;

    const pollForTweet = async (maxAttempts: number = 5) => {
      console.log('pollForTweet', isSearchingRef.current);
      let attempts = 0;

      while (attempts < maxAttempts) {
        console.log(`pollForTweet attempt ${attempts}`, isSearchingRef.current);
        if (!isSearchingRef.current) {
          console.log('pollForTweet exiting..', isSearchingRef.current);
          return;
        }

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

    pollForTweet();
  }, [isSearchingTweet]);



  const handleOnUserTweeted = () => {
    setIsSearchingTweet(true);
  };

  const handleRetrySearch = () => {
    setIsTimeout(false);
    setIsUserTweeted(true);
    setIsSearchingTweet(true);
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

    const tweetText = encodeURIComponent(getCurrentTweetText());
    const intentUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

    // Show the confirmation popup
    setDisplayITweetedButton(true);

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

    // regenerate auth code
    const code = generateAuthCode(account!.address);
    setAuthCode(code);
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.waveContainer}
        style={{
          transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`,
        }}
      >
        <img src="/image/xcloude.webp" alt="" className={styles.waveImage} />
      </div>
      <div
        className={styles.planeContainer}
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
        }}
      >
        <img src="/image/planepng.webp" alt="" className={styles.planeImage} />
      </div>

      <div
        className={styles.cloudContainer}
        style={{
          transform: `translate(${mousePosition.x * -0.3}px, ${mousePosition.y * -0.3}px)`,
        }}
      >
        <img src="/image/whcloude.webp" alt="" className={styles.cloudImage} />
      </div>
      <div
        className={styles.birdContainer}
        style={{
          transform: `translate(${mousePosition.x * -0.5}px, ${mousePosition.y * -0.5}px)`,
        }}
      >
        <img src="/image/birds.webp" alt="" className={styles.birdImage} />
      </div>
      {/* Top navigation bar with AccountButton */}
      <div className="w-full flex justify-end p-4 mt-5 mr-5" style={{ marginTop: '15px', marginRight: '30px' }}>
        <AccountButton />
      </div>

      {/* Main content */}
      <main className="flex min-h-[calc(100vh-4rem)] z-10">
        <div className="text-center space-y-8">

          <div className={styles.contentArea}>
            <h1 className="text-2xl font-bold mb-4">Connect X</h1>

            <div className={styles.twitterConnectTabsWrapper}>
              <button
                className={`${styles.tabButton} ${verificationSection === "tweetToVerify" ? styles.tabActive : ''}`}
                onClick={() => setVerificationSection("tweetToVerify")}
              >
                <span className={styles.tabText}>Tweet to Verify</span>
              </button>
              <button
                className={`${styles.tabButton} ${verificationSection === "oauth" ? styles.tabActive : ''}`}
                onClick={() => setVerificationSection("oauth")}
              >
                <span className={styles.tabText}>Connect with X</span>
              </button>
            </div>

            {verificationSection === "tweetToVerify" && (
              <div className={styles.customModalContent}>
                <div className={styles.text}>Here is your verification code. You should post tweet with them. Click on button below to post tweet.</div>
                <div className={styles.customTweetBox}>
                  <div className={styles.tweetBoxHeader}>
                    <span className={styles.tweetBoxLabel}>Your tweet message:</span>
                    <button className={styles.refreshTweetButton} onClick={handleRefreshTweet}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>
                  </div>
                  <p className={styles.tweetPreview}>{getCurrentTweetText()}</p>
                  <div className={styles.modalCodeWrapper}>
                    <strong className={styles.customAuthCode}>{authCode}</strong>
                    <button className={styles.modalCopyButton}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  </div>
                </div>

                <button className={styles.customOrangeButton} onClick={handleShareOnX}>POST ON X</button>
              </div>
            )}

            {verificationSection === "oauth" && (
              <div className={styles.customModalContent}>
                <div className={styles.text}>Don't want to tweet? Use OAuth2 protocol and sign in with X natively using X modal</div>

                <button className={styles.customOrangeButton} onClick={handleXSignIn}>SIGN IN WITH X</button>

                {isLinkProfileError && (
                  <p className="text-red-500 mt-2" style={{ color: 'red' }}>Error signing in with X. Please try again.</p>
                )}
                {xAccountAlreadyLinked && (
                  <p className="text-red-500 mt-2" style={{ color: 'red' }}>This X account is already used for different wallet. Try to logout and login using this X account. Or use authCode verification method</p>
                )}
              </div>
            )}
          </div>



          {displayITweetedButton && (
            <Modal onClose={() => setDisplayITweetedButton(false)}>
              <div className="mt-8">
                <p>Tweeted? <br /> Click on button to verify your account.</p>
                <button className={styles.customOrangeButton} onClick={handleOnUserTweeted} style={{ marginTop: '20px' }}>VERIFY MY TWEET</button>
              </div>
            </Modal>

          )}

        </div >

        {
          isSearchingTweet && (
            <Modal onClose={() => setIsSearchingTweet(false)}>
              <div className="inset-0 bg-[#ffffff] flex items-center justify-center">
                <div className="bg-[#ffffff] p-8 rounded-lg shadow-xl flex flex-col items-center space-y-6">
                  <svg
                    width="56" height="56" viewBox="0 0 50 50"
                    className="animate-spin"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <circle className="opacity-20" cx="25" cy="25" r="20" stroke="#1DA1F2" strokeWidth="7" fill="none" />
                    <circle cx="25" cy="25" r="20" stroke="#1DA1F2" strokeWidth="7" fill="none" strokeDasharray="31.4 125.6" strokeLinecap="round" />
                  </svg>
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                  <div className="text-center space-y-2" style={{ marginBottom: '30px' }}>
                    <p className="text-xl font-medium text-gray-800">Verifying your tweet...</p>
                    <p className="text-sm text-gray-500">This should only take a moment</p>
                  </div>
                </div>
              </div>
            </Modal>
          )
        }

        {isConfirmingUsername && foundTweet && (
          <Modal>
            <div className="inset-0 bg-[#ffffff] flex items-center justify-center">
              <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
                <p className="text-lg font-medium">Are you <span className="text-xl font-bold text-[#1DA1F2]">@{foundTweet.username}</span> on X?</p>
                <div style={{ marginTop: '30px' }}>
                  <button
                    onClick={handleUsernameConfirm}
                    className={styles.customBlueButton}
                  >
                    Yes, that's me
                  </button>
                  <button
                    onClick={handleUsernameReject}
                    className={styles.customRedButton}
                  >
                    No, try again
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Timeout Popup */}
        {
          isTimeout && (
            <Modal onClose={() => setIsTimeout(false)}>
              <div className="inset-0 bg-[#ffffff] flex items-center justify-center">
                <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
                  <p className="text-lg font-medium">Cannot find your tweet...</p>
                  <p>You sure you posted tweet with code?</p>
                  <div className="" style={{ marginTop: '30px' }}>

                    <button
                      onClick={handleRetrySearch}
                      className={styles.customBlueButton}
                    >
                      Yes, try again
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          )
        }

      </main >
    </div >
  );
} 