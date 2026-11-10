import React from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Label, Row, Icon } from './ui';
import { useTheme } from './theme';
import { isValidDate, todayString } from './logic';

// Browser date picker: on iPhone this opens the normal date wheel instead of typing a date.
// Values stay as 'YYYY-MM-DD' strings like the rest of the app.
// optional: the date can be empty, with an "Add date" button and a clear button.
export default function DateField({ label, value, onChange, optional, style, accessibilityLabel }) {
  const c = useTheme();
  const has = !!value;
  // The picker's own Clear button gives an empty value. Only optional dates may be emptied.
  const changed = (e) => {
    const v = e.target.value;
    if (isValidDate(v)) onChange(v);
    else if (!v && optional) onChange('');
  };
  return (
    <View style={style}>
      {label ? <Label>{label}</Label> : null}
      {optional && !has ? (
        <Btn title="Add date" icon="calendar-outline" kind="soft" onPress={() => onChange(todayString())} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <Row style={{ gap: 6 }}>
          <input type="date" className="date-input" value={isValidDate(value) ? value : ''} onChange={changed}
            aria-label={accessibilityLabel || label || 'Date'}
            style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', minHeight: 42, margin: 0, padding: '9px 12px', fontSize: 16,
              fontFamily: 'inherit', borderWidth: 1, borderStyle: 'solid', borderColor: c.line, borderRadius: 10,
              color: c.text, backgroundColor: c.input, colorScheme: c.mode }} />
          {optional ? (
            <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear date" hitSlop={8} style={{ padding: 6 }}>
              <Icon name="close-circle" size={20} color={c.muted} />
            </Pressable>
          ) : null}
        </Row>
      )}
    </View>
  );
}
