import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as api from '../api/heatHaven';

function getFromPrice(p: api.Product): number | null {
  const prices = (p.variants ?? []).map(v => v.price).filter(n => Number.isFinite(n));
  if (!prices.length) return null;
  return Math.min(...prices);
}

export function ProductsScreen() {
  const [items, setItems] = useState<api.Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await api.getProducts();
    setItems(res.data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load products');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.h1}>Products</Text>
        <Text style={styles.h2}>Live from your `/api/products`</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn’t load products</Text>
          <Text style={styles.muted}>{error}</Text>
          <Text style={[styles.muted, { marginTop: 10 }]}>
            If you’re on a phone, set `EXPO_PUBLIC_API_BASE_URL` to your PC’s LAN IP (example: `http://192.168.1.10:5000`).
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => item._id ?? String(item.legacyId ?? idx)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {(item.brand ?? '—') + ' • ' + (item.category ?? '—')}
              </Text>
              <Text style={styles.price}>
                ₹ {getFromPrice(item) ?? '—'}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1020' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  h1: { fontSize: 28, fontWeight: '900', color: '#fff' },
  h2: { marginTop: 4, color: 'rgba(255,255,255,0.65)' },
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  name: { color: '#fff', fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 4, color: 'rgba(255,255,255,0.65)' },
  price: { marginTop: 10, color: '#ff6a3d', fontSize: 16, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  muted: { color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  errorTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

