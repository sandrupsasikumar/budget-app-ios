import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Switch } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, radius, statusColor } from './theme';

// Text for a number input that also follows outside changes (a restore, or data synced from the cloud)
// without fighting the person while they type. toValue turns the text back into the stored number.
export function useNumberText(value, format = String, toValue = parseFloat) {
  const [text, setText] = useState(() => format(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    // Adjusting state during render is React's recommended way to follow a changed prop.
    setSeen(value);
    if (toValue(text) !== value) setText(format(value));
  }
  return [text, setText];
}

export function Card({ children, style }) {
  const c = useTheme();
  return <View style={[{ backgroundColor: c.card, borderRadius: radius, padding: 16, borderWidth: 1, borderColor: c.line }, style]}>{children}</View>;
}

export function H({ children, right, sub }) {
  const c = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{children}</Text>
        {right}
      </View>
      {sub ? <Text style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

export function T({ children, style, muted, size = 15, weight, color, ...rest }) {
  const c = useTheme();
  return <Text style={[{ fontSize: size, color: color || (muted ? c.muted : c.text), fontWeight: weight }, style]} {...rest}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'primary', style, disabled, icon }) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? c.bad : kind === 'ghost' ? 'transparent' : c.accentSoft;
  const fg = kind === 'primary' ? c.accentText : kind === 'danger' ? '#fff' : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title || icon}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      {title ? <Text style={{ fontSize: 15, fontWeight: '700', color: fg }}>{title}</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
        borderColor: active ? c.accent : c.line, backgroundColor: active ? c.accent : c.card }}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? c.accentText : c.muted} /> : null}
      <Text style={{ fontSize: 14, color: active ? c.accentText : c.text, fontWeight: active ? '700' : '400' }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>{children}</ScrollView>;
}

export function Label({ children }) {
  const c = useTheme();
  return <Text style={{ fontSize: 12, color: c.muted, marginBottom: 6, fontWeight: '600' }}>{children}</Text>;
}

export function Field({ label, style, inputStyle, ...props }) {
  const c = useTheme();
  return (
    <View style={style}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={c.muted}
        style={[{ borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: c.text, backgroundColor: c.input }, inputStyle]}
        {...props}
      />
    </View>
  );
}

export function Toggle({ label, sub, value, onChange }) {
  const c = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: !!value }}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ fontSize: 15, color: c.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 12, color: c.muted }}>{sub}</Text> : null}
      </View>
      <Switch value={!!value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.track }} thumbColor="#fff" accessibilityLabel={label} />
    </Pressable>
  );
}

export function Bar({ value, status, max = 1, color, height = 8 }) {
  const c = useTheme();
  const pct = Math.max(0, Math.min(1, max <= 0 ? (value > 0 ? 1 : 0) : value / max));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color || statusColor(c, status) }} />
    </View>
  );
}

export function Pill({ text, status, color }) {
  const c = useTheme();
  const col = color || statusColor(c, status);
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: col + '26' }}>
      <Text style={{ color: col, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Divider() {
  const c = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line, marginVertical: 8 }} />;
}

export function Screen({ children }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }} keyboardShouldPersistTaps="handled"
      // iOS does not move content above the keyboard by itself.
      automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
      {children}
    </ScrollView>
  );
}

export function Icon(props) {
  return <Ionicons {...props} />;
}
