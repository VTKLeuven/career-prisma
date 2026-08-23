import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { ExportedBooth } from '../../types/floorplan';
import { ContactPersonCard } from './ContactPersonCard';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { MapPin, Globe, X, Building, Briefcase, GraduationCap } from 'lucide-react-native';

export interface CompanyDetailSheetProps {
  booth: ExportedBooth | null;
  visible: boolean;
  onClose: () => void;
}

export const CompanyDetailSheet: React.FC<CompanyDetailSheetProps> = ({
  booth,
  visible,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%', '85%'], []);

  useEffect(() => {
    if (visible && booth) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, booth]);

  if (!booth) return null;

  const company = booth.company;
  const companyName = company?.name || 'Unassigned Stand';

  const handleVisitWebsite = async () => {
    if (!company?.website) return;
    try {
      await WebBrowser.openBrowserAsync(company.website);
    } catch (e) {
      console.error('Failed to open web browser:', e);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.sheetHeader}>
        <View style={styles.boothBadge}>
          <Text style={styles.boothBadgeText}>Stand {booth.booth_number}</Text>
        </View>

        <Text style={styles.companyTitle} numberOfLines={1}>
          {companyName}
        </Text>

        <Pressable style={styles.closeButton} onPress={onClose}>
          <X size={20} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {/* Company Overview Card */}
        {company ? (
          <View style={styles.overviewCard}>
            <View style={styles.logoAndMeta}>
              {company.logo_url ? (
                <Image
                  source={{ uri: company.logo_url }}
                  style={styles.logoImage}
                  contentFit="contain"
                  transition={200}
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>
                    {companyName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.metaRight}>
                <View style={styles.iconLabelRow}>
                  <MapPin size={14} color={COLORS.textMuted} style={styles.inlineIcon} />
                  <Text style={styles.locationText}>
                    {company.location || 'Exhibition Hall'}
                  </Text>
                </View>

                {company.website && (
                  <Pressable style={styles.websiteButton} onPress={handleVisitWebsite}>
                    <Globe size={13} color={COLORS.accent} style={styles.inlineIcon} />
                    <Text style={styles.websiteButtonText}>Visit Website</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {company.short_description && (
              <Text style={styles.shortDesc}>{company.short_description}</Text>
            )}
            {company.long_description && (
              <Text style={styles.longDesc}>{company.long_description}</Text>
            )}
          </View>
        ) : (
          <View style={styles.unassignedCard}>
            <Building size={32} color={COLORS.textMuted} />
            <Text style={styles.unassignedText}>
              Stand {booth.booth_number} is currently unassigned.
            </Text>
          </View>
        )}

        {/* Target Fields / Degree Badges */}
        {company?.category && company.category.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <GraduationCap size={16} color={COLORS.primary} style={styles.inlineIcon} />
              <Text style={styles.sectionTitle}>Target Fields & Degrees</Text>
            </View>
            <View style={styles.badgeRow}>
              {company.category.map((cat) => (
                <View key={cat.id} style={styles.degreeBadge}>
                  <Text style={styles.degreeBadgeText}>
                    {cat.name} ({cat.short_name})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Representatives / Contact Persons */}
        {company?.representatives && company.representatives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Stand Representatives ({company.representatives.length})
            </Text>
            {company.representatives.map((rep) => (
              <ContactPersonCard key={rep.id} representative={rep} />
            ))}
          </View>
        )}

        {/* Vacancies / Open Roles */}
        {company?.vacancies && company.vacancies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Briefcase size={16} color={COLORS.primary} style={styles.inlineIcon} />
              <Text style={styles.sectionTitle}>
                Open Opportunities ({company.vacancies.length})
              </Text>
            </View>
            {company.vacancies.map((vac) => (
              <View key={vac.id} style={styles.vacancyCard}>
                <View style={styles.vacancyHeader}>
                  <Text style={styles.vacancyTitle}>{vac.title}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{vac.type}</Text>
                  </View>
                </View>
                {vac.location && (
                  <View style={styles.iconLabelRow}>
                    <MapPin size={12} color={COLORS.textMuted} style={styles.inlineIcon} />
                    <Text style={styles.vacancyLocation}>{vac.location}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.lg,
  },
  handleIndicator: {
    backgroundColor: COLORS.borderDark,
    width: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  boothBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.sm,
  },
  boothBadgeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  companyTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  overviewCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  unassignedCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  unassignedText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  logoAndMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logoImage: {
    width: 70,
    height: 50,
    marginRight: SPACING.md,
  },
  logoPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  logoPlaceholderText: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  metaRight: {
    flex: 1,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  websiteButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  shortDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  longDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  degreeBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  degreeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  vacancyCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vacancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vacancyTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  typeBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  vacancyLocation: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
