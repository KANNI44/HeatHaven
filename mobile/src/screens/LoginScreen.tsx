import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    try {
      setLoading(true);
      await signIn(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HeatHaven</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        style={styles.input}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" style={styles.input} />

      <Pressable onPress={onSubmit} disabled={loading} style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}>
        {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Sign in</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#0b1020' },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  subtitle: { marginTop: 6, marginBottom: 24, color: 'rgba(255,255,255,0.7)' },
  label: { marginTop: 12, marginBottom: 6, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  button: {
    marginTop: 18,
    backgroundColor: '#ff6a3d',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { fontSize: 16, fontWeight: '800', color: '#0b1020' },
});

