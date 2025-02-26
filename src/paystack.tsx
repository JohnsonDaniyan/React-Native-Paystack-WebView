import * as React from 'react'

import { ActivityIndicator, Modal, SafeAreaView, View } from 'react-native';
import { PayStackProps, PayStackRef } from './types';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { getAmountValueInKobo, getChannels } from './helper';

const CLOSE_URL = 'https://standard.paystack.co/close';

const Paystack: React.ForwardRefRenderFunction<React.ReactNode, PayStackProps> = (
  {
    splitCode,
    paystackKey,
    billingEmail,
    phone,
    lastName,
    firstName,
    amount = '0.00',
    currency = 'NGN',
    channels = ['card'],
    refNumber,
    billingName,
    handleWebViewMessage,
    onCancel,
    autoStart = false,
    onSuccess,
    activityIndicatorColor = 'green',
  },
  ref,
) => {
  const [isLoading, setisLoading] = useState(true);
  const [showModal, setshowModal] = useState(false);
  const webView = useRef(null);

  useEffect(() => {
    autoStartCheck();
  }, []);

  useImperativeHandle(ref, () => ({
    startTransaction() {
      setshowModal(true);
    },
    endTransaction() {
      setshowModal(false);
    },
  }));

  const autoStartCheck = () => {
    if (autoStart) {
      setshowModal(true);
    }
  };

  const refNumberString = refNumber ? `ref: '${refNumber}',` : ''; // should only send ref number if present, else if blank, paystack will auto-generate one

  const Paystackcontent = `   
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="ie=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Paystack</title>
        </head>
          <body  onload="payWithPaystack()" style="background-color:#fff;height:100vh">
            <script src="https://js.paystack.co/v1/inline.js"></script>
            <script type="text/javascript">
              window.onload = payWithPaystack;
              function payWithPaystack(){
              var handler = PaystackPop.setup({ 
                split_code: '${splitCode}',
                key: '${paystackKey}',
                email: '${billingEmail}',
                firstname: '${firstName}',
                lastname: '${lastName}',
                phone: '${phone}',
                amount: ${getAmountValueInKobo(amount)}, 
                currency: '${currency}',
                ${getChannels(channels)}
                ${refNumberString}
                metadata: {
                custom_fields: [
                        {
                        display_name:  '${firstName + ' ' + lastName}',
                        variable_name:  '${billingName}',
                        value:''
                        }
                ]},
                callback: function(response){
                      var resp = {event:'successful', transactionRef:response};
                        window.ReactNativeWebView.postMessage(JSON.stringify(resp))
                },
                onClose: function(){
                    var resp = {event:'cancelled'};
                    window.ReactNativeWebView.postMessage(JSON.stringify(resp))
                }
                });
                handler.openIframe();
                }
            </script> 
          </body>
      </html> 
      `;

  const messageReceived = (data: string) => {
    const webResponse = JSON.parse(data);
    if (handleWebViewMessage) {
      handleWebViewMessage(data);
    }
    switch (webResponse.event) {
      case 'cancelled':
        setshowModal(false);
        onCancel({ status: 'cancelled' });
        break;

      case 'successful':
        setshowModal(false);
        const reference = webResponse.transactionRef;

        if (onSuccess) {
          onSuccess({
            status: 'success',
            transactionRef: reference,
            data: webResponse,
          });
        }
        break;

      default:
        if (handleWebViewMessage) {
          handleWebViewMessage(data);
        }
        break;
    }
  };

  const onNavigationStateChange = (state: WebViewNavigation) => {
    const { url } = state;
    if (url === CLOSE_URL) {
      setshowModal(false);
    }
  };

  return (
    <Modal style={{ flex: 1 }} visible={showModal} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1 }}>
        <WebView
          style={[{ flex: 1 }]}
          source={{ html: Paystackcontent }}
          onMessage={(e) => {
            messageReceived(e.nativeEvent?.data);
          }}
          onLoadStart={() => setisLoading(true)}
          onLoadEnd={() => setisLoading(false)}
          onNavigationStateChange={onNavigationStateChange}
          ref={webView}
          cacheEnabled={false}
          cacheMode={'LOAD_NO_CACHE'}
        />

        {isLoading && (
          <View>
            <ActivityIndicator size="large" color={activityIndicatorColor} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default forwardRef(Paystack);




