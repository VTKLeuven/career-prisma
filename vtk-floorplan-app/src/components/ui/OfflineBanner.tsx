import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { WifiOff } from 'lucide-react-native';

export interface OfflineBannerProps {
  isOffline: boolean;
  lastSynced?: number | null;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, lastSynced }) => {
  if (!isOffline) return null;

  const formattedTime = lastSynced ? new Date(lastSynced).toLocaleTimeString() : null;

  return (
    <View style={styles.banner}>
      <WifiOff size={14} color={COLORS.textInverse} style={styles.icon} />
      <Text style={styles.text}>
        Offline Mode — Showing Cached Map {formattedTime ? `(Synced ${formattedTime})` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
});
