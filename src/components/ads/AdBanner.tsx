import React, {useEffect, useState} from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';
import {
  AdsConsent,
  BannerAd,
  BannerAdSize,
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads';
import mobileAds from 'react-native-google-mobile-ads';

import styles from '../../styles/adBanner';

interface AdBannerProps {
  enabled: boolean;
}

const IOS_PRODUCTION_BANNER_ID = 'ca-app-pub-7240722756258184/3915742939';

let initializationPromise: Promise<boolean> | null = null;

async function initializeAds() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        if (!__DEV__) {
          try {
            const consentInfo = await AdsConsent.gatherConsent();
            if (!consentInfo.canRequestAds) {
              initializationPromise = null;
              return false;
            }
          } catch (consentError) {
            // Google recommends checking the cached consent state when the current
            // consent update fails. Do not block ads if a previous valid consent exists.
            const cachedConsent = await AdsConsent.getConsentInfo().catch(() => null);
            if (!cachedConsent?.canRequestAds) {
              console.warn('[Ads] 동의 상태를 확인할 수 없어 광고 요청을 보류합니다:', consentError);
              initializationPromise = null;
              return false;
            }
          }
        }

        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
        });
        await mobileAds().initialize();
        return true;
      } catch (error) {
        console.warn('[Ads] 광고 초기화 실패:', error);
        initializationPromise = null;
        return false;
      }
    })();
  }

  return initializationPromise;
}

function AdBanner({enabled}: AdBannerProps) {
  const [isReady, setIsReady] = useState(false);
  const [hasAd, setHasAd] = useState(true);
  const [bannerHeight, setBannerHeight] = useState(50);
  const {width} = useWindowDimensions();
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.OS === 'ios'
    ? IOS_PRODUCTION_BANNER_ID
    : null;

  useEffect(() => {
    let active = true;
    if (!enabled) {
      return () => {
        active = false;
      };
    }

    void initializeAds().then(ready => {
      if (active) {
        setIsReady(ready);
      }
    });

    return () => {
      active = false;
    };
  }, [enabled]);

  useEffect(() => {
    setHasAd(true);
  }, [enabled]);

  if (!enabled || !isReady || !hasAd || !adUnitId) {
    return null;
  }

  return (
    <View style={[styles.container, {height: bannerHeight}]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        width={width}
        requestOptions={{requestNonPersonalizedAdsOnly: true}}
        onAdLoaded={({height}) => setBannerHeight(height)}
        onAdFailedToLoad={error => {
          console.warn('[Ads] 배너 광고 조회 실패:', error.message);
          setHasAd(false);
        }}
      />
    </View>
  );
}

export default AdBanner;
