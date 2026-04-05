import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';
import simpleService from './services/simpleService';

import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import QuizScreen from './screens/QuizScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MatchesScreen from './screens/MatchesScreen';
import TipsScreen from './screens/TipsScreen';
import ZodiacQuizScreen from './screens/ZodiacQuizScreen';
import ProfileDetailScreen from './screens/ProfileDetailScreen';
import BlockedUsersScreen from './screens/BlockedUsersScreen';
import AdminReportsScreen from './screens/AdminReportsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Must match screens/LoginScreen.js admin routing
const ADMIN_EMAIL = 'deepmatch.noreply@gmail.com';

function MainTabs() {
    return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { display: 'none' }, // Hide the tab bar
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Tips" component={TipsScreen} />
    </Tab.Navigator>
    );
}

export default function App() {
  const [bootstrap, setBootstrap] = useState(null);

  useEffect(() => {
    (async () => {
      let initialRouteName = 'Login';
      let mainTabsInitialParams = undefined;

      try {
        const [token, userJson] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          AsyncStorage.getItem('current_user'),
        ]);

        const hasSession = token != null && String(token).trim().length > 0;
        if (hasSession && userJson) {
          const user = JSON.parse(userJson);
          const userEmail = (user.email || '').toLowerCase();
          const isAdmin =
            userEmail === ADMIN_EMAIL.toLowerCase() || user.is_admin;

          if (user.email) {
            simpleService.setCurrentUser(user.email);
          }

          if (isAdmin) {
            initialRouteName = 'AdminReports';
          } else {
            initialRouteName = 'MainTabs';
            mainTabsInitialParams = { screen: 'Profile' };
          }
        } else if (hasSession) {
          initialRouteName = 'MainTabs';
          mainTabsInitialParams = { screen: 'Profile' };
        }

        setBootstrap({
          initialRouteName,
          mainTabsInitialParams,
        });
      } catch (e) {
        console.warn('App bootstrap failed:', e);
        setBootstrap({
          initialRouteName: 'Login',
          mainTabsInitialParams: undefined,
        });
      }
    })();
  }, []);

  if (bootstrap === null) return null;

  const { initialRouteName, mainTabsInitialParams } = bootstrap;

  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="ZodiacQuiz" component={ZodiacQuizScreen} />
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ gestureEnabled: false }}
            initialParams={mainTabsInitialParams}
          />
          <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
