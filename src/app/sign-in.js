import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Btn, Field, T } from '../ui';
import { useTheme } from '../theme';
import { useData } from '../state';
import { authMessage, resetPassword } from '../cloud';
import { say } from '../platform';

export default function SignIn() {
  const c = useTheme();
  const { data, account } = useData();
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const hasLocalData = data.transactions.length > 0;

  const submit = async () => {
    if (!email.trim() || !password) { setError('Enter your email and a password.'); return; }
    setBusy(true);
    setError(null);
    try {
      await account.signIn(email, password, create);
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) { setError('Type your email above, then tap Forgot password again.'); return; }
    try {
      await resetPassword(email);
      say('Check your email', `If there is an account for ${email.trim()}, a link to set a new password is on its way.`);
    } catch (e) {
      setError(authMessage(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 }}
        keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="wallet" size={38} color={c.accentText} />
          </View>
          <T size={28} weight="800">Budget</T>
          <T muted style={{ textAlign: 'center' }}>
            {create ? 'Create an account so your budget is backed up and syncs between devices.' : 'Sign in to sync your budget and keep it safe if Safari clears its storage.'}
          </T>
        </View>

        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com"
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          autoComplete="email" textContentType="username" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder={create ? 'At least 6 characters' : ''}
          secureTextEntry autoCapitalize="none" autoCorrect={false}
          autoComplete={create ? 'new-password' : 'current-password'} textContentType={create ? 'newPassword' : 'password'}
          onSubmitEditing={submit} returnKeyType="go" />

        {error ? <T size={13} color={c.bad}>{error}</T> : null}
        {hasLocalData ? (
          <T size={12} muted>
            This device has {data.transactions.length} transactions. A new account starts with them. Signing in to an account that already has data replaces them with the account&apos;s copy.
          </T>
        ) : null}

        {busy ? <ActivityIndicator color={c.accent} /> : (
          <Btn title={create ? 'Create account' : 'Sign in'} onPress={submit} />
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={() => { setCreate(!create); setError(null); }} hitSlop={8} accessibilityRole="button">
            <T size={14} color={c.accent} weight="700">{create ? 'I already have an account' : 'Create an account'}</T>
          </Pressable>
          {!create ? (
            <Pressable onPress={forgot} hitSlop={8} accessibilityRole="button">
              <T size={14} color={c.accent} weight="700">Forgot password</T>
            </Pressable>
          ) : null}
        </View>

        <Btn title="Use on this device only" kind="ghost" onPress={account.chooseLocal} disabled={busy} style={{ marginTop: 12 }} />
        <T size={12} muted style={{ textAlign: 'center' }}>You can sign in later from the Budget tab.</T>
      </ScrollView>
    </SafeAreaView>
  );
}
