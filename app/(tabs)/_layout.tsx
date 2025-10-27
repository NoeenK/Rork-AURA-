import { Tabs } from "expo-router";
import { Mic, BookHeart, User } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tabIconSelected,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === 'web' 
            ? 'rgba(0, 0, 0, 0.6)' 
            : 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS !== 'web' ? (
            <BlurView
              intensity={80}
              style={StyleSheet.absoluteFillObject}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Record",
          tabBarIcon: ({ color, size }) => <Mic color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: "Memories",
          tabBarIcon: ({ color, size }) => <BookHeart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
