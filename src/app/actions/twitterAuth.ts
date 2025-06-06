"use server";

import { gcm } from '@noble/ciphers/aes';
import { bytesToHex, hexToBytes, toBytes } from "@noble/ciphers/utils";
import { randomBytes } from '@noble/ciphers/webcrypto';
import { cookies } from 'next/headers';

export interface TwitterUserInfo {
    username: string;
    userId: string;
    encryptedAccessToken: string;
}

export async function getTwitterUserInfo(code: string, redirectUri: string): Promise<TwitterUserInfo> {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;

    if (!codeVerifier) {
        throw new Error('Code verifier not found in session');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri as string,
            code_verifier: codeVerifier
        })
    });

    if (!tokenResponse.ok) {
        throw new Error(`Failed to get access token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;


    // Get user information using the access token
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!userResponse.ok) {
        throw new Error(`Failed to get user info: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    return {
        username: userData.data.username,
        userId: userData.data.id,
        encryptedAccessToken: encryptDataFunc(accessToken, process.env.AUTH_ENCRYPTION_KEY as string)
    };
}

const encryptDataFunc = function encryptData(data: string, key: string) {
    const nonce = randomBytes(24);
    const aes = gcm(hexToBytes(key), nonce);
    const ciphertext = aes.encrypt(toBytes(data));
    return bytesToHex(nonce) + bytesToHex(ciphertext);
};