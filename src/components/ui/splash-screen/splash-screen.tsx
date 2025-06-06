import React from "react";
import SunLoader from "../loader/loader";
import styles from "./SplashScreen.module.css";

interface SplashScreenProps {
    isLoading: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.bg}>
                <div className={styles.content}>
                    <SunLoader />
                </div>
            </div>
        </div>
    );
};

export default SplashScreen; 