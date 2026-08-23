import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useFloorplanData } from '../../src/hooks/useFloorplanData';
import { ContactPersonCard } from '../../src/components/company/ContactPersonCard';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../src/constants/theme';
import { ArrowLeft, Globe, MapPin } from 'lucide-react-native';

export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading } = useFloorplanData('jobfair-2026');

  const booth = data?.booths.find(
    (b) => b.company?.id === id || String(b.company_id) === id
  );
  const company = booth?.company;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading company details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={COLORS.surface} />
          </Pressable>
          <Text style={styles.headerTitle}>Company Details</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Company not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleVisitWebsite = async () => {
    if (!company.website) return;
    try {
      await WebBrowser.openBrowserAsync(company.website);
    } catch (e) {
      console.error('Failed to open web browser:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.surface} />
        </Pressable>
        <Text style={styles.headerTitle}>{company.name}</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Company Card Header */}
        <View style={styles.card}>
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
                  {company.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.metaRight}>
              <Text style={styles.locationText}>
                <MapPin size={14} color={COLORS.textMuted} /> {company.location || 'Exhibition Hall'}
              </Text>
              {booth && (
                <View style={styles.boothBadge}>
                  <Text style={styles.boothBadgeText}>Stand {booth.booth_number}</Text>
                </View>
              )}
            </View>
          </View>

          {company.website && (
            <Pressable style={styles.websiteButton} onPress={handleVisitWebsite}>
              <Globe size={16} color={COLORS.accent} style={{ marginRight: 6 }} />
              <Text style={styles.websiteButtonText}>Visit Official Website</Text>
            </Pressable>
          )}

          {company.short_description && (
            <Text style={styles.shortDesc}>{company.short_description}</Text>
          )}
          {company.long_description && (
            <Text style={styles.longDesc}>{company.long_description}</Text>
          )}
        </View>

        {/* Target Degrees */}
        {company.category && company.category.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Target Fields & Degrees</Text>
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

        {/* Representatives */}
        {company.representatives && company.representatives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Stand Representatives ({company.representatives.length})
            </Text>
            {company.representatives.map((rep) => (
              <ContactPersonCard key={rep.id} representative={rep} />
            ))}
          </View>
        )}

        {/* Vacancies */}
        {company.vacancies && company.vacancies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Open Vacancies ({company.vacancies.length})
            </Text>
            {company.vacancies.map((vac) => (
              <View key={vac.id} style={styles.vacancyCard}>
                <View style={styles.vacancyHeader}>
                  <Text style={styles.vacancyTitle}>{vac.title}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{vac.type}</Text>
                  </View>
                </View>
                {vac.location && (
                  <Text style={styles.vacancyLocation}>📍 {vac.location}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    marginRight: SPACING.sm,
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  logoAndMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logoImage: {
    width: 80,
    height: 55,
    marginRight: SPACING.md,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  logoPlaceholderText: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  metaRight: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  boothBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
  },
  boothBadgeText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.sm,
  },
  websiteButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  shortDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  longDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  degreeBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  degreeBadgeText: {
    fontSize: 13,
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
    marginTop: 4,
  },
});
