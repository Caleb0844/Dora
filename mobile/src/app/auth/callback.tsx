import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log('OAuth callback params:', params);
  }, [params]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Sign-In Callback</Text>
      <Text style={styles.text}>Callback received.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  text: {
    marginTop: 10,
    color: '#64748B',
  },
});
