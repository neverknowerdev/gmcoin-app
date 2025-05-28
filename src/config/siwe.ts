import { getCsrfToken, signIn, signOut, getSession } from "next-auth/react";
import type {
    SIWEVerifyMessageArgs,
    SIWECreateMessageArgs,
    SIWESession,
} from "@reown/appkit-siwe";
import { createSIWEConfig, formatMessage } from "@reown/appkit-siwe";
import { base, baseSepolia } from "@reown/appkit/networks";

const chain = process.env.NEXT_PUBLIC_ENV === 'mainnet' ? base : baseSepolia;

export const siweConfig = createSIWEConfig({
    getMessageParams: async () => ({
        domain: typeof window !== "undefined" ? window.location.host : "",
        uri: typeof window !== "undefined" ? window.location.origin : "",
        chains: [chain.id],
        statement: "Please sign with your account",
    }),
    createMessage: ({ address, ...args }: SIWECreateMessageArgs) =>
        formatMessage(args, address),
    getNonce: async () => {
        const nonce = await getCsrfToken();
        if (!nonce) {
            throw new Error("Failed to get nonce!");
        }
        return nonce;
    },
    getSession: async () => {
        const session = await getSession();
        if (!session) {
            return null;
        }

        if (
            typeof session.address !== "string" ||
            typeof session.chainId !== "number"
        ) {
            return null;
        }

        return {
            address: session.address,
            chainId: session.chainId,
        } satisfies SIWESession;
    },
    verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
        try {
            const success = await signIn("credentials", {
                message,
                redirect: false,
                signature,
                callbackUrl: "/protected",
            });

            return Boolean(success?.ok);
        } catch (error) {
            return false;
        }
    },
    signOut: async () => {
        try {
            await signOut({
                redirect: false,
            });
            return true;
        } catch (error) {
            return false;
        }
    },
}); 