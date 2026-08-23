import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { ExportedRepresentative } from '../../types/floorplan';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { Mail, Phone } from 'lucide-react-native';

export interface ContactPersonCardProps {
  representative: ExportedRepresentative;
}

export const ContactPersonCard: React.FC<ContactPersonCardProps> = ({ representative }) => {
  const firstName = representative.first_name || '';
  const lastName = representative.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Stand Representative';
  const initials = `${firstName.substring(0, 1)}${lastName.substring(0, 1)}`.toUpperCase() || 'VTK';

  const handleCall = async () => {
    if (!representative.tel) return;
    const url = `tel:${representative.tel.replace(/\s+/g, '')}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Call Action', `Dial ${representative.tel}`);
      }
    } catch (e) {
      Alert.alert('Error', `Could not open dialer for ${representative.tel}`);
    }
  };

  const handleEmail = async () => {
    if (!representative.email) return;
    const url = `mailto:${representative.email}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Email Action', `Email ${representative.email}`);
      }
    } catch (e) {
      Alert.alert('Error', `Could not open mail client for ${representative.email}`);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.initialsText}>{initials}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.nameText}>{fullName}</Text>
        {representative.title && (
          <Text style={styles.titleText}>{representative.title}</Text>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {representative.email && (
          <Pressable style={[styles.actionButton, styles.emailButton]} onPress={handleEmail}>
            <Mail size={16} color={COLORS.surface} />
          </Pressable>
        )}

        {representative.tel && (
          <Pressable style={[styles.actionButton, styles.callButton]} onPress={handleCall}>
            <Phone size={16} color={COLORS.surface} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  initialsText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  titleText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  emailButton: {
    backgroundColor: COLORS.primary,
  },
  callButton: {
    backgroundColor: COLORS.success,
  },
});
