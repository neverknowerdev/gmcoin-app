"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AccountButton() {
    const router = useRouter();
    const { status, isConnected } = useAppKitAccount();

    useEffect(() => {
        if (status === "disconnected") {
            router.push("/login");
        }
    }, [status]);

    return (
        <div className="accountButton">
            <appkit-button />
        </div>
    );
} 