import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { trpc, trpcClient } from "@/lib/trpc";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { JournalProvider } from "@/contexts/JournalContext";
import { Audio } from "expo-av";
import { Platform } from "react-native";

const queryClient = new QueryClient();

function RootLayoutNav() {
  useEffect(() => {
    const requestSpeechRecognitionPermission = async (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (typeof (global as any).SpeechRecognition !== 'undefined' || 
            typeof (global as any).webkitSpeechRecognition !== 'undefined') {
          try {
            const SpeechRecognition = (global as any).SpeechRecognition || 
                                    (global as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.onerror = () => resolve(false);
            recognition.onstart = () => {
              recognition.stop();
              resolve(true);
            };
            recognition.start();
          } catch (error) {
            console.log('Speech recognition permission request failed:', error);
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    };

    const requestPermissions = async () => {
      try {
        const audioPermission = await Audio.requestPermissionsAsync();
        
        if (!audioPermission.granted) {
          console.log('Microphone permission not granted');
        }
        
        if (Platform.OS === 'ios') {
          const speechPermission = await requestSpeechRecognitionPermission();
          if (!speechPermission) {
            console.log('Speech recognition permission not granted');
          }
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    };

    requestPermissions();
  }, []);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="journal" options={{ headerShown: false, animation: "slide_from_left" }} />
      <Stack.Screen name="ask-aura" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="recording" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="calendar" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="goals" options={{ headerShown: false }} />
      <Stack.Screen name="insights" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
      <Stack.Screen name="actions" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <JournalProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </JournalProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
