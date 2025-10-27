import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import GradientBackground from "@/components/GradientBackground";
import { AuraColors } from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerShown: false }} />
      <GradientBackground>
        <View style={styles.container}>
          <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>Go to home screen!</Text>
          </Link>
        </View>
      </GradientBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: AuraColors.white,
    marginBottom: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: AuraColors.accentOrange,
    borderRadius: 14,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AuraColors.white,
  },
});
