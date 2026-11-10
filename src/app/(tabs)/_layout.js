import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router/js-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme';

const icon = (name) => function TabIcon({ focused, color, size }) {
  return <Ionicons name={focused ? name : `${name}-outline`} size={size ?? 22} color={color} />;
};

function AddButton({ onPress }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Add expense"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="add" size={30} color={c.accentText} />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  // Tall enough for the round + button and the labels, plus the iPhone home bar area.
  const bottom = Math.max(insets.bottom, 6);
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: c.card },
      headerTitleAlign: 'left',
      headerTitleStyle: { color: c.text, fontSize: 22, fontWeight: '800' },
      headerShadowVisible: false,
      sceneStyle: { backgroundColor: c.bg },
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line, height: 58 + bottom, paddingTop: 6, paddingBottom: bottom },
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarLabel: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: icon('list') }} />
      <Tabs.Screen name="add" options={{ title: 'Add expense', tabBarLabel: () => null, tabBarButton: (props) => <AddButton onPress={props.onPress} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan and goals', tabBarLabel: 'Plan', tabBarIcon: icon('flag') }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget', tabBarIcon: icon('wallet') }} />
    </Tabs>
  );
}
