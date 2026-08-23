import React, { useState, useMemo } from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator, Text } from 'react-native';
import { useFloorplanData } from '../src/hooks/useFloorplanData';
import { FloorplanHeader } from '../src/components/floorplan/FloorplanHeader';
import { CategoryFilterPills, CategoryItem } from '../src/components/floorplan/CategoryFilterPills';
import { InteractiveFloorplan } from '../src/components/floorplan/InteractiveFloorplan';
import { CompanyDetailSheet } from '../src/components/company/CompanyDetailSheet';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { ExportedBooth } from '../src/types/floorplan';
import { COLORS, SPACING } from '../src/constants/theme';

export default function HomeScreen() {
  const { data, loading, isOffline, lastSynced } = useFloorplanData('jobfair-2026');
  const [selectedBooth, setSelectedBooth] = useState<ExportedBooth | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchedBoothId, setSearchedBoothId] = useState<number | null>(null);

  // Extract master degree categories dynamically from booths data
  const categories: CategoryItem[] = useMemo(() => {
    const defaultCats: CategoryItem[] = [{ id: null, name: 'All Masters' }];
    if (!data?.booths) return defaultCats;

    const catMap = new Map<number, CategoryItem>();
    data.booths.forEach((b) => {
      b.company?.category?.forEach((c) => {
        if (!catMap.has(c.id)) {
          catMap.set(c.id, { id: c.id, name: c.name, shortName: c.short_name });
        }
      });
    });

    return [...defaultCats, ...Array.from(catMap.values())];
  }, [data]);

  const handleSelectBooth = (booth: ExportedBooth) => {
    setSelectedBooth(booth);
    setModalVisible(true);
  };

  const handleSelectSearchResult = (booth: ExportedBooth) => {
    setSearchedBoothId(booth.id);
    setSelectedBooth(booth);
    setModalVisible(true);

    setTimeout(() => {
      setSearchedBoothId(null);
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header & Search Autocomplete */}
        <FloorplanHeader
          booths={data?.booths || []}
          onSelectSearchResult={handleSelectSearchResult}
          isOffline={isOffline}
        />

        {/* Master Degree Category Filter Bar */}
        <CategoryFilterPills
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => setSelectedCategoryId(id)}
        />

        {/* Interactive Floorplan Vector Map Canvas */}
        <View style={styles.mapCanvas}>
          {loading || !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading Interactive Floorplan...</Text>
            </View>
          ) : (
            <InteractiveFloorplan
              data={data}
              selectedBoothId={selectedBooth?.id}
              selectedCategoryId={selectedCategoryId}
              searchedBoothId={searchedBoothId}
              onSelectBooth={handleSelectBooth}
            />
          )}
        </View>

        {/* Full Company Details & Representatives Bottom Sheet */}
        <CompanyDetailSheet
          booth={selectedBooth}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapCanvas: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
    fontSize: 15,
  },
});
