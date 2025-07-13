"use client";


import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import AccountButton from "../../../components/AccountButton";
import { generateAuthCode as generateAuthCodeServer } from "../../../utils/authCode";
import { searchTweetByUrlOrUsername, searchTweetWithAuthCode } from "../../actions/twitterSearch";
import type { TweetResult } from "../../actions/twitterSearch";
import styles from "./page.module.css";
import Modal from "../../../components/ui/modal/Modal";
import { useAppKitAccount } from "@reown/appkit/react";
import { generateCodeVerifier } from "../../../utils/authHelpers";
import { generateCodeChallenge } from "../../../utils/authHelpers";
import { useSearchParams } from 'next/navigation';
import { getTwitterUserInfo } from "../../actions/twitterAuth";
import Cookies from 'js-cookie';
import { useReadContract } from "wagmi";
import { useDisconnect } from "@reown/appkit/react";
import { wagmiContractConfig } from "../../../config/contractAbi";
import SunLoader from "../../../components/ui/loader/loader";
import { useTracking } from "../../../hooks/useTracking";
// import SplashScreen from "../../../components/ui/splash-screen/splash-screen";


export default function ConnectX() {
  const router = useRouter();
  const { trackPageVisit, trackTwitterVerification } = useTracking();
  const { allAccounts, address, isConnected, caipAddress, status, embeddedWalletInfo } = useAppKitAccount();
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [isShowRegisteredModal, setShowRegisteredModal] = useState(false);
  const [xUserID, setXUserID] = useState<string | null>(null);
  const { disconnect } = useDisconnect();

  const { data: isRegistered, isFetched: isFetchedIsRegistered, isFetching: isFetchingIsRegistered } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'isTwitterUserRegistered',
    args: [xUserID!],
    query: {
      enabled: !!xUserID,
    }
  });

  useEffect(() => {
    if (isFetchedIsRegistered) {
      if (isRegistered === true) {
        setShowRegisteredModal(true);
      } else if (isRegistered === false) {
        router.push('/login/send-transaction');
      }
    }
  }, [isFetchingIsRegistered, isFetchedIsRegistered]);


  useEffect(() => {
    if (status === "disconnected") {
      router.push('/login');
    }
  }, [status]);

  const searchParams = useSearchParams();

  let isWaitingForOAuthInitValue = false;
  let verificationSectionInitValue: "tweetToVerify" | "oauth" = "tweetToVerify";
  const code = searchParams.get('code');
  if (code) {
    isWaitingForOAuthInitValue = true;
    verificationSectionInitValue = "oauth";
  }

  const [waitingForOauthConfirm, setWaitingForOauthConfirm] = useState(isWaitingForOAuthInitValue);
  const [oauthRequestError, setOauthRequestError] = useState<string | null>(null);

  const [verificationSection, setVerificationSection] = useState<"tweetToVerify" | "oauth">(verificationSectionInitValue);
  const [displayITweetedButton, setDisplayITweetedButton] = useState(false);

  // Restore modal state from localStorage on page load
  useEffect(() => {
    const savedModalState = localStorage.getItem('displayITweetedButton');
    if (savedModalState === 'true') {
      setDisplayITweetedButton(true);
    }
  }, []);

  // Helper function to set modal state and persist to localStorage
  const setDisplayITweetedButtonWithPersistence = (value: boolean) => {
    setDisplayITweetedButton(value);
    if (value) {
      localStorage.setItem('displayITweetedButton', 'true');
    } else {
      localStorage.removeItem('displayITweetedButton');
    }
  };

  const [isSearchingTweetByAuthCode, setIsSearchingTweetByAuthCode] = useState(false);
  const [isSearchingTweetByUsernameOrTweetUrl, setIsSearchingTweetByUsernameOrTweetUrl] = useState(false);
  const isSearchingRef = useRef(isSearchingTweetByAuthCode);
  const [foundTweet, setFoundTweet] = useState<TweetResult | null>(null);
  const [isTwitterSearchFailed, setIsTwitterSearchFailed] = useState(false);

  const [tweetTextIndex, setTweetTextIndex] = useState(0);

  const [isEnteringManually, setIsEnteringManually] = useState(false);
  const [usernameOrTweetUrlInput, setUsernameOrTweetUrlInput] = useState('');
  const [twitterManualSearchError, setTwitterManualSearchError] = useState('');

  const generateAuthCode = () => {
    if (address && isConnected) {
      const code = generateAuthCodeServer(address);
      setAuthCode(code);
      localStorage.setItem('authCode', code);
    }
  }

  useEffect(() => {
    const authCode = localStorage.getItem('authCode');

    if (authCode) {
      // Verify that the authCode is from this address
      const walletStartingLetterNumber = parseInt(authCode.slice(2, 4));
      const wallet10Letters = authCode.slice(4, 14);
      const currentWallet10Letters = address?.slice(walletStartingLetterNumber, walletStartingLetterNumber + 10).toUpperCase();

      if (currentWallet10Letters === wallet10Letters) {
        setAuthCode(authCode);
      } else {
        // If authCode doesn't match current address, generate a new one
        generateAuthCode();
      }
    } else {
      generateAuthCode();
    }
  }, [address]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUsernameOrTweetUrlInput(text);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  useEffect(() => {
    const fetchTwitterAuth = async (code: string) => {
      try {
        const twitterUserInfo = await getTwitterUserInfo(code, window.location.origin + window.location.pathname);

        const { username, userId, encryptedAccessToken } = twitterUserInfo;

        if (username && userId && encryptedAccessToken) {
          localStorage.setItem('xUsername', username);
          localStorage.setItem('xUserID', userId);
          localStorage.setItem('encryptedAccessToken', encryptedAccessToken);
          setXUserID(userId);
        }
      } catch (error: any) {
        setOauthRequestError(error.message);
        console.error('Error fetching Twitter auth:', error);

        setWaitingForOauthConfirm(false);
      }
    }

    const code = searchParams.get('code');
    if (code) {
      router.replace(window.location.pathname);

      fetchTwitterAuth(code);
    }
  }, [searchParams]);

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
    return `${tweetTexts[tweetTextIndex]}\n\n${authCode} 🚀`;
  };

  const handleRefreshTweet = () => {
    setTweetTextIndex((prevIndex) => (prevIndex + 1) % tweetTexts.length);
  };

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
    trackPageVisit("Connect X");
  }, [trackPageVisit]);

  useEffect(() => {
    isSearchingRef.current = isSearchingTweetByAuthCode;
  }, [isSearchingTweetByAuthCode]);

  useEffect(() => {
    if (!isSearchingTweetByAuthCode) return;

    const pollForTweet = async (maxAttempts: number = 5) => {
      let attempts = 0;

      while (attempts < maxAttempts) {
        if (!isSearchingRef.current) {
          return;
        }

        try {
          const tweets = await searchTweetWithAuthCode(authCode || '');
          if (tweets.length > 0) {
            // Get the earliest tweet
            const earliestTweet = tweets.reduce((earliest, current) => {
              return new Date(current.postedAt) < new Date(earliest.postedAt) ? current : earliest;
            });

            setIsSearchingTweetByAuthCode(false);
            setFoundTweet(earliestTweet);
            return true;
          }
        } catch (error) {
          console.error('Error searching for tweet:', error);
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
      }

      setIsSearchingTweetByAuthCode(false);
      setIsTwitterSearchFailed(true);
      return false;
    };

    pollForTweet();
  }, [isSearchingTweetByAuthCode]);



  const handleOnUserTweeted = () => {
    setIsSearchingTweetByAuthCode(true);
  };

  const handleRetrySearch = () => {
    setIsTwitterSearchFailed(false);

    setIsSearchingTweetByAuthCode(true);
  };

  const handleXSignIn = async () => {
    trackTwitterVerification("oauth");

    const verifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(verifier);

    Cookies.set('twitter_code_verifier', verifier);

    const redirectUri = encodeURIComponent(
      window.location.origin + window.location.pathname
    );

    const twitterAuthUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=users.read%20tweet.read&state=state123&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = twitterAuthUrl;
  };

  const handleShareOnX = () => {
    if (!authCode) return;
    
    trackTwitterVerification("tweet");

    const tweetText = encodeURIComponent(getCurrentTweetText());
    const intentUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

    // Show the confirmation popup
    setDisplayITweetedButtonWithPersistence(true);

    // Open the intent window
    window.open(intentUrl, '_blank');
  };

  const handleGoToLogin = () => {
    setShowRegisteredModal(false);

    // Clear modal state when going back to login
    setDisplayITweetedButtonWithPersistence(false);

    disconnect();
    router.push("/login");
  };

  const handleEnterManually = async () => {
    try {
      setIsEnteringManually(false);
      setIsSearchingTweetByUsernameOrTweetUrl(true);
      setIsTwitterSearchFailed(false);
      const tweets = await searchTweetByUrlOrUsername(usernameOrTweetUrlInput, authCode!);
      setIsSearchingTweetByUsernameOrTweetUrl(false);
      if (tweets.length > 0) {
        setFoundTweet(tweets[0]);
      } else {
        setTwitterManualSearchError('No tweet found');
        setIsEnteringManually(true);
      }
    } catch (error) {
      console.error('Error searching for tweet:', error);
    }
  };

  useEffect(() => {
    if (foundTweet?.userID) {
      localStorage.setItem('authCode', authCode || '');
      localStorage.setItem('xUsername', foundTweet?.username || '');
      localStorage.setItem('xUserID', foundTweet?.userID || '');
      localStorage.setItem('xTweetID', foundTweet?.tweetID || '');

      // Clear modal state since verification is complete
      setDisplayITweetedButtonWithPersistence(false);

      router.push('/login/send-transaction');
    }
  }, [foundTweet]);

  const handleCopyToClipboard = async () => {
    if (!authCode) return;
    try {
      await navigator.clipboard.writeText(authCode);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className={styles.container}>
      {/* <SplashScreen isLoading={isLoading} /> */}
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
                    <button className={styles.modalCopyButton} onClick={handleCopyToClipboard}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  </div>
                </div>

                <button className={styles.customOrangeButton} onClick={handleShareOnX}>POST ON X</button>
              </div>
            )}

            {verificationSection === "oauth" && (
              <div className={styles.customModalContent}>
                {waitingForOauthConfirm ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className={styles.text}>Waiting for OAuth2 confirmation...</div>
                    <SunLoader />
                  </div>
                ) : (
                  <>
                    <div className={styles.text}>Don't want to tweet? Use OAuth2 protocol and sign in with X natively using X modal</div>

                    <button className={styles.customOrangeButton} onClick={handleXSignIn}>SIGN IN WITH X</button>

                    {oauthRequestError && (
                      <p className="text-red-500 mt-2" style={{ color: 'red' }}>{oauthRequestError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>



          {displayITweetedButton && (
            <Modal onClose={() => setDisplayITweetedButtonWithPersistence(false)}>
              <div className="mt-8">
                <p>Tweeted? <br /> Click on button to verify your account.</p>
                <button className={styles.customOrangeButton} onClick={handleOnUserTweeted} style={{ marginTop: '20px' }}>VERIFY MY TWEET</button>
              </div>
            </Modal>

          )}

        </div >

        {
          isSearchingTweetByAuthCode || isSearchingTweetByUsernameOrTweetUrl && (
            <Modal onClose={() => {
              setIsSearchingTweetByAuthCode(false);
              setIsSearchingTweetByUsernameOrTweetUrl(false);
            }}>
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

        {
          isTwitterSearchFailed && (
            <Modal onClose={() => setIsTwitterSearchFailed(false)}>
              <div className="inset-0 bg-[#ffffff] flex items-center justify-center">
                <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
                  <p className="text-lg font-medium">Cannot find your tweet...</p>
                  <p className="text-[16px] text-gray-500">X can not give tweets in results for some accounts. If you're sure you posted it, you can enter your username or tweet's URL manually.</p>
                  <div className="" style={{ marginTop: '30px' }}>

                    <button
                      onClick={handleRetrySearch}
                      className={styles.customBlueButton}
                    >
                      Search again
                    </button>

                    <button
                      onClick={() => {
                        setIsEnteringManually(true);
                        setIsTwitterSearchFailed(false);
                      }}
                      className={styles.customOrangeButton}
                    >
                      Enter manually
                    </button>
                  </div>


                </div>
              </div>
            </Modal>
          )
        }

        {isEnteringManually && (
          <Modal onClose={() => setIsEnteringManually(false)}>
            <div className="inset-0 bg-[#ffffff] flex items-center justify-center">
              <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
                {twitterManualSearchError && <p className="text-lg font-medium" style={{ color: 'red' }}>Error: {twitterManualSearchError}</p>}
                <p className="text-lg font-medium">Enter manually</p>
                <br />

                <div className={styles.inputGroup}>
                  <input
                    name="usernameOrTweetUrl"
                    type="text"
                    placeholder="Username of tweet URL"
                    className={styles.input}
                    autoComplete="off"
                    inputMode="text"
                    autoCorrect="off"
                    value={usernameOrTweetUrlInput}
                    onChange={(e) => setUsernameOrTweetUrlInput(e.target.value)}
                  />
                  <button
                    onClick={handlePasteFromClipboard}
                    className={styles.pasteButton}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500" style={{ fontSize: '1rem' }}>Provide your username or tweet's URL that contains verification code</p>
                <br />
                <button className={styles.customBlueButton} onClick={handleEnterManually}>Search</button>

              </div>

            </div>
          </Modal>
        )}

        {foundTweet && (
          <Modal>
            <div className="inset-0 bg-[#ffffff] flex items-center justify-center">
              <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
                <p className="text-lg font-medium">Verification tweet found! Redirecting...</p>
              </div>
            </div>
          </Modal>
        )}

        {isShowRegisteredModal && (
          <Modal>
            <div className="inset-0 bg-[#ffffff] flex items-center justify-center">
              <div className="bg-[#ffffff] p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
                <p className="text-lg font-medium">This X account is already registered with a different wallet</p>
                <p className="text-sm text-gray-500">Please connect using the wallet that was used for the initial registration</p>
                <div style={{ marginTop: '30px' }}>
                  <button
                    onClick={handleGoToLogin}
                    className={styles.customBlueButton}
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

      </main >
    </div >
  );
}
