import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { trpc, trpcClient } from "@/lib/trpc";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { JournalProvider } from "@/contexts/JournalContext";

const queryClient = new QueryClient();

function RootLayoutNav() {


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
