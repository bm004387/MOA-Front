import React, {useEffect, useState} from 'react';
import {Modal, Pressable, Text, TouchableOpacity, View} from 'react-native';

import {AppSafeAreaProvider, AppSafeAreaView} from '../common/AppSafeArea';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';
import type {WebViewErrorEvent, WebViewHttpErrorEvent} from 'react-native-webview/lib/WebViewTypes';
import commonStyles from '../../styles/common';

interface AddressSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
}

const postcodeHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    html, body, #container {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #FFFFFF;
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <script>
    (function () {
      function sendMessage(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function showPostcode() {
        if (!window.kakao || typeof window.kakao.Postcode !== 'function') {
          sendMessage({type: 'error', message: '주소 검색 서비스를 초기화하지 못했습니다.'});
          return;
        }

        new window.kakao.Postcode({
          oncomplete: function (data) {
            var address = data.roadAddress || data.jibunAddress || data.address || '';
            if (address) {
              sendMessage({type: 'selected', address: address});
            }
          },
          width: '100%',
          height: '100%',
          animation: true,
          hideMapBtn: true
        }).embed(document.getElementById('container'));
      }

      var postcodeScript = document.createElement('script');
      postcodeScript.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      postcodeScript.onload = showPostcode;
      postcodeScript.onerror = function () {
        sendMessage({type: 'error', message: '주소 검색 스크립트를 불러오지 못했습니다.'});
      };
      document.head.appendChild(postcodeScript);
    })();
  </script>
</body>
</html>
`;

function AddressSearchModal({visible, onClose, onSelect}: AddressSearchModalProps) {
  const [loadError, setLoadError] = useState('');
  const [webViewKey, setWebViewKey] = useState(0);

  useEffect(() => {
    if (visible) {
      setLoadError('');
      setWebViewKey(value => value + 1);
    }
  }, [visible]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: 'selected' | 'error';
        address?: string;
        message?: string;
      };

      if (data.type === 'error') {
        setLoadError(data.message || '주소 검색을 불러오지 못했습니다.');
        return;
      }
      if (data.address) onSelect(data.address);
    } catch (error) {
      console.error('주소 검색 결과 처리 실패:', error);
      setLoadError('주소 검색 결과를 처리하지 못했습니다.');
    }
  };

  const handleWebViewError = (event: WebViewErrorEvent) => {
    console.error('주소 검색 WebView 로드 실패:', event.nativeEvent);
    setLoadError('주소 검색을 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.');
  };

  const handleHttpError = (event: WebViewHttpErrorEvent) => {
    console.error('주소 검색 HTTP 오류:', event.nativeEvent.statusCode, event.nativeEvent.url);
    setLoadError(`주소 검색 서비스를 불러오지 못했습니다. (HTTP ${event.nativeEvent.statusCode})`);
  };

  const retry = () => {
    setLoadError('');
    setWebViewKey(value => value + 1);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <AppSafeAreaProvider>
        <AppSafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}} edges={['top', 'bottom']}>
          <View
            style={{
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
              backgroundColor: '#FFFFFF',
            }}>
            <Text style={commonStyles.modalTitle}>주소 검색</Text>
            <TouchableOpacity
              style={{minWidth: 60, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end'}}
              onPress={onClose}
              activeOpacity={0.7}>
              <Text style={commonStyles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>

          <View style={{flex: 1, width: '100%', overflow: 'hidden'}}>
            {loadError ? (
              <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24}}>
                <Text style={{textAlign: 'center', color: '#555555', marginBottom: 16}}>{loadError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={retry}
                  style={{minHeight: 44, justifyContent: 'center', paddingHorizontal: 20}}>
                  <Text style={{fontWeight: '700', color: '#352B24'}}>다시 시도</Text>
                </Pressable>
              </View>
            ) : (
              <WebView
                key={webViewKey}
                source={{html: postcodeHTML, baseUrl: 'https://postcode.map.kakao.com'}}
                onMessage={handleMessage}
                onError={handleWebViewError}
                onHttpError={handleHttpError}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                automaticallyAdjustContentInsets={false}
                bounces={false}
                scrollEnabled={false}
                style={{flex: 1, width: '100%'}}
              />
            )}
          </View>
        </AppSafeAreaView>
      </AppSafeAreaProvider>
    </Modal>
  );
}

export default AddressSearchModal;
