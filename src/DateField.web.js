import React from 'react';
import { Field } from './ui';

// Web has no native date picker module, so the date is typed as YYYY-MM-DD.
export default function DateField({ label, value, onChange, optional, style, accessibilityLabel }) {
  return (
    <Field style={style} label={label} value={value || ''} onChangeText={onChange} autoCapitalize="none"
      placeholder={optional ? 'YYYY-MM-DD (optional)' : 'YYYY-MM-DD'} accessibilityLabel={accessibilityLabel || label} />
  );
}
