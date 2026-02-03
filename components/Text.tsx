import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

/**
 * Custom Text component that uses Poppins font by default
 * Extends all native Text props
 */
export default function Text(props: TextProps) {
  const { style, ...restProps } = props;
  
  return (
    <RNText 
      style={[styles.defaultText, style]} 
      {...restProps}
    />
  );
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'Poppins_400Regular',
  },
});
