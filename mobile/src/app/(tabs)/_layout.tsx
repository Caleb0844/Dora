import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/bottom-nav';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          position: 'absolute',
          height: 58,
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="nearby/index" />
      <Tabs.Screen name="add/index" />
      <Tabs.Screen name="collab/index" />
      <Tabs.Screen name="profile/index" />
    </Tabs>
  );
}
