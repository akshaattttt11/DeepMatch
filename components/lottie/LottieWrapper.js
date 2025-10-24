import React, { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';

export default function LottieWrapper(props) {
  const [LottieView, setLottieView] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (Platform.OS === 'web') {
      import('lottie-react')
        .then(mod => {
          if (isMounted) setLottieView(() => mod.default);
        })
        .catch(() => setLottieView(null));
    } else {
      import('lottie-react-native')
        .then(mod => {
          if (isMounted) setLottieView(() => mod.default);
        })
        .catch(() => setLottieView(null));
    }
    return () => {
      isMounted = false;
    };
  }, []);

  if (!LottieView) {
    return <Text style={{ color: '#fff', textAlign: 'center' }}>Loading animation...</Text>;
  }
  if (Platform.OS === 'web') {
    // lottie-react expects 'animationData' instead of 'source'
    const { source, ...rest } = props;
    // Some bundlers wrap JSON under .default
    const animationData = (source && source.default) || source;
    return <LottieView animationData={animationData} {...rest} />;
  }
  // Native: lottie-react-native uses 'source'
  return <LottieView {...props} />;
}