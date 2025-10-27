import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Folder, Plus } from 'lucide-react-native';
import { AuraColors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface FolderItem {
  id: string;
  name: string;
  size: string;
  count: number;
  color: string;
}

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  
  const [folders] = useState<FolderItem[]>([
    { id: '1', name: 'Recording', size: '1.1 GB', count: 35, color: AuraColors.accentOrange },
    { id: '2', name: 'YouTube', size: '124 MB', count: 15, color: '#FF6B6B' },
    { id: '3', name: 'Import Voice', size: '652 MB', count: 30, color: '#4ECDC4' },
    { id: '4', name: 'Class', size: '130 MB', count: 16, color: '#95E1D3' },
    { id: '5', name: 'Work', size: '874 MB', count: 20, color: '#F38181' },
    { id: '6', name: 'Class', size: '938 MB', count: 35, color: '#AA96DA' },
    { id: '7', name: 'Work', size: '586 MB', count: 40, color: '#FCBAD3' },
  ]);
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Folders</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.newFolderCard}
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          >
            <Plus color={AuraColors.accentOrange} size={32} />
            <Text style={styles.newFolderText}>New folder</Text>
          </TouchableOpacity>
          
          {folders.map((folder) => (
            <TouchableOpacity
              key={folder.id}
              style={styles.folderCard}
              activeOpacity={0.7}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
              <View style={[styles.folderIcon, { backgroundColor: folder.color }]}>
                <Folder color={AuraColors.white} size={28} />
              </View>
              <View style={styles.folderInfo}>
                <Text style={styles.folderName}>{folder.name}</Text>
                <Text style={styles.folderSize}>{folder.size}</Text>
              </View>
              <Text style={styles.folderCount}>{folder.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuraColors.darkBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: AuraColors.white,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  newFolderCard: {
    width: '47%',
    aspectRatio: 1.5,
    backgroundColor: AuraColors.darkCard,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: AuraColors.darkBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newFolderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: AuraColors.accentOrange,
  },
  folderCard: {
    width: '47%',
    aspectRatio: 1.5,
    backgroundColor: AuraColors.darkCard,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  folderIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AuraColors.white,
    marginBottom: 4,
  },
  folderSize: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  folderCount: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: AuraColors.white,
    textAlign: 'right',
  },
});