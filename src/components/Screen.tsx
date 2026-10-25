import { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

export const WIDE = 960;

export function useWide() {
  return useWindowDimensions().width >= WIDE;
}

/** Scrollable page with a centered column that widens on large screens. */
export function Screen({ children, max = 1120 }: { children: ReactNode; max?: number }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.inner, { maxWidth: max }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 56 },
  inner: { width: '100%', alignSelf: 'center' },
});
