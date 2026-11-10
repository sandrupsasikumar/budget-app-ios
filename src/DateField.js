import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Btn, Label, Row, T, Icon } from './ui';
import { useTheme } from './theme';
import { isValidDate, todayString } from './logic';

// Phone date picker. Values stay as 'YYYY-MM-DD' strings like the rest of the app.
// optional: the date can be empty, with an "Add date" button and a clear button.

function toDate(s) {
  const v = isValidDate(s) ? s : todayString();
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function DateField({ label, value, onChange, optional, style, accessibilityLabel }) {
  const c = useTheme();
  const has = !!value;
  const pick = (d) => d && onChange(todayString(d));

  let control;
  if (optional && !has) {
    control = <Btn title="Add date" icon="calendar-outline" kind="soft" onPress={() => onChange(todayString())} style={{ alignSelf: 'flex-start' }} />;
  } else if (Platform.OS === 'ios') {
    control = (
      <DateTimePicker value={toDate(value)} mode="date" display="compact" themeVariant={c.mode} accentColor={c.accent}
        onChange={(_, d) => pick(d)} accessibilityLabel={accessibilityLabel || label} style={{ alignSelf: 'flex-start' }} />
    );
  } else {
    const open = () => DateTimePickerAndroid.open({ value: toDate(value), mode: 'date', onChange: (e, d) => e.type === 'set' && pick(d) });
    control = (
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}
        style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.input, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="calendar-outline" size={18} color={c.muted} />
        <T>{value}</T>
      </Pressable>
    );
  }

  return (
    <View style={style}>
      {label ? <Label>{label}</Label> : null}
      <Row style={{ gap: 6 }}>
        {control}
        {optional && has ? (
          <Pressable onPress={() => onChange('')} accessibilityLabel="Clear date" hitSlop={8} style={{ padding: 6 }}>
            <Icon name="close-circle" size={20} color={c.muted} />
          </Pressable>
        ) : null}
      </Row>
    </View>
  );
}
