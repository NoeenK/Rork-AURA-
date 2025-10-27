import { Tabs } from "expo-router";
import { Mic, BookOpen, User } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

import { AuraColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AuraColors.accentOrange,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === 'web' 
            ? colors.card 
            : 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 8,
        },
        tabBarBackground: () =>
          Platform.OS !== 'web' ? (
            <BlurView
              intensity={95}
              tint={colors.tabBarTint as 'light' | 'dark'}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Recording",
          tabBarIcon: ({ color, size }) => <Mic color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
