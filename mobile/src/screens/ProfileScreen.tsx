import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export function ProfileScreen() {
  const { state, signOut } = useAuth();

  if (state.status !== 'signedIn') return null;

  const u = state.user;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.h1}>Profile</Text>
        <Text style={styles.row}>Name: {u.name}</Text>
        <Text style={styles.row}>Email: {u.email}</Text>
        <Text style={styles.row}>Phone: {u.phone ?? '—'}</Text>
        <Text style={styles.row}>Role: {u.role}</Text>
      </View>

      <Pressable onPress={signOut} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1020', padding: 16, gap: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  h1: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  row: { color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  button: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
});

