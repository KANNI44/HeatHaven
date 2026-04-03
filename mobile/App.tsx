import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

type RootStackParamList = {
  Login: undefined;
  Products: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Starting…</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1020' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#0b1020' },
      }}
    >
      {state.status === 'signedOut' ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen
            name="Products"
            component={ProductsScreen}
            options={({ navigation }) => ({
              title: 'HeatHaven',
              headerRight: () => (
                <Pressable onPress={() => navigation.navigate('Profile')} style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.8 }]}>
                  <Text style={styles.headerBtnText}>Profile</Text>
                </Pressable>
              ),
            })}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'You' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={DarkTheme}>
        <RootNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0b1020',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { color: 'rgba(255,255,255,0.7)' },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.10)' },
  headerBtnText: { color: '#fff', fontWeight: '800' },
});
