import React from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider, useData } from '../state';
import { ThemeContext, light, dark } from '../theme';

// Shows a "Try again" screen instead of a blank one if a screen crashes.
export { ErrorBoundary } from 'expo-router';

function RootNavigator() {
  const { data, ready, needsSignIn } = useData();
  const scheme = useColorScheme();
  const pref = data?.settings?.theme || 'system';
  const c = pref === 'dark' || (pref === 'system' && scheme === 'dark') ? dark : light;

  return (
    <ThemeContext.Provider value={c}>
      <StatusBar style={c.mode === 'dark' ? 'light' : 'dark'} />
      {!ready ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <Stack screenOptions={{
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.accent,
          headerTitleStyle: { color: c.text, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.bg },
        }}>
          <Stack.Protected guard={!needsSignIn}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="edit/[id]" options={{ title: 'Edit expense', headerBackTitle: 'Back' }} />
          </Stack.Protected>
          <Stack.Protected guard={needsSignIn}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <RootNavigator />
      </DataProvider>
    </SafeAreaProvider>
  );
}
