import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
 

import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import QuizScreen from './screens/QuizScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MatchesScreen from './screens/MatchesScreen';
import TipsScreen from './screens/TipsScreen';
import ZodiacQuizScreen from './screens/ZodiacQuizScreen';
import ProfileDetailScreen from './screens/ProfileDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
  const [quizDone, setQuizDone] = useState(null);

  useEffect(() => {
    (async () => {
      const quiz = await AsyncStorage.getItem('user_quiz_results');
      setQuizDone(!!quiz);
    })();
  }, []);

  if (quizDone === null) return null; // or a splash/loading screen

    return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="ZodiacQuiz" component={ZodiacQuizScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ gestureEnabled: false }} />
        <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    );
}
