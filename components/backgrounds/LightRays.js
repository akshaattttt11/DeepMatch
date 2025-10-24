import React from 'react';
import { View, Dimensions } from 'react-native';

// Try to import LinearGradient, fallback to simple View if not available
let LinearGradient;
try {
  const expoLinearGradient = require('expo-linear-gradient');
  LinearGradient = expoLinearGradient.LinearGradient;
} catch (error) {
  // Fallback: create a simple gradient-like effect with View
  LinearGradient = ({ colors, start, end, style, children }) => {
    const [primaryColor] = colors;
    return (
      <View
        style={[
          style,
          {
            backgroundColor: primaryColor,
            opacity: 0.3,
          }
        ]}
      >
        {children}
      </View>
    );
  };
}

const { width, height } = Dimensions.get('window');

const LightRays = ({
  raysOrigin = "top-center",
  raysColor = "#00ffff",
  raysSpeed = 1.5,
  lightSpread = 0.8,
  rayLength = 1.2,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0.1,
  distortion = 0.05,
  style = {},
}) => {
  // Calculate gradient colors based on raysColor
  const getGradientColors = () => {
    const baseColor = raysColor;
    return [
      `${baseColor}40`, // Very transparent
      `${baseColor}20`, // More transparent
      `${baseColor}10`, // Even more transparent
      'transparent'
    ];
  };

  // Calculate gradient positions based on raysOrigin
  const getGradientProps = () => {
    switch (raysOrigin) {
      case "top-center":
        return {
          colors: getGradientColors(),
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
        };
      case "top-left":
        return {
          colors: getGradientColors(),
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
        };
      case "top-right":
        return {
          colors: getGradientColors(),
          start: { x: 1, y: 0 },
          end: { x: 0, y: 1 },
        };
      case "center":
        return {
          colors: getGradientColors(),
          start: { x: 0.5, y: 0.5 },
          end: { x: 0.5, y: 1 },
        };
      case "bottom-center":
        return {
          colors: getGradientColors(),
          start: { x: 0.5, y: 1 },
          end: { x: 0.5, y: 0 },
        };
      default:
        return {
          colors: getGradientColors(),
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
        };
    }
  };

  const gradientProps = getGradientProps();

  return (
    <View 
      style={[{ width: '100%', height: '100%', position: 'absolute' }, style]}
    >
      <LinearGradient
        {...gradientProps}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
        }}
      />
      
      {/* Add a subtle overlay for more depth */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          borderRadius: 0,
        }}
      />
    </View>
  );
};

export default LightRays; 