import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, SafeAreaView, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import LottieWrapper from '../components/lottie/LottieWrapper';

// API Configuration
const API_BASE_URL = 'http://10.220.165.132:5000';

const { width, height } = Dimensions.get('window');
const QUIZ_STORAGE_KEY = 'user_quiz_results';

// MBTI Questions (50)
const mbtiQuestions = [
  { question: 'When faced with a new situation, do you:', answers: [ { text: 'Rely on logic and analysis', value: 'T' }, { text: 'Trust your feelings and intuition', value: 'F' } ] },
  { question: 'Do you prefer to:', answers: [ { text: 'Plan everything in advance', value: 'J' }, { text: 'Go with the flow', value: 'P' } ] },
  { question: 'Are you more energized by:', answers: [ { text: 'Spending time alone', value: 'I' }, { text: 'Being with others', value: 'E' } ] },
  { question: 'Do you focus on:', answers: [ { text: 'Details and facts', value: 'S' }, { text: 'Big picture and ideas', value: 'N' } ] },
  { question: 'In a group, are you:', answers: [ { text: 'The listener', value: 'I' }, { text: 'The talker', value: 'E' } ] },
  { question: 'When making decisions, do you:', answers: [ { text: 'Use objective criteria', value: 'T' }, { text: 'Consider people and emotions', value: 'F' } ] },
  { question: 'Do you prefer:', answers: [ { text: 'Routine', value: 'J' }, { text: 'Spontaneity', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Practical', value: 'S' }, { text: 'Imaginative', value: 'N' } ] },
  { question: 'Do you recharge by:', answers: [ { text: 'Solitude', value: 'I' }, { text: 'Socializing', value: 'E' } ] },
  { question: 'Do you value:', answers: [ { text: 'Logic', value: 'T' }, { text: 'Harmony', value: 'F' } ] },
  { question: 'Do you prefer to work:', answers: [ { text: 'Independently', value: 'I' }, { text: 'In a team', value: 'E' } ] },
  { question: 'Are you more comfortable with:', answers: [ { text: 'Concrete facts', value: 'S' }, { text: 'Abstract ideas', value: 'N' } ] },
  { question: 'Do you make decisions based on:', answers: [ { text: 'Logic', value: 'T' }, { text: 'Feelings', value: 'F' } ] },
  { question: 'Do you prefer your life to be:', answers: [ { text: 'Structured', value: 'J' }, { text: 'Flexible', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Reserved', value: 'I' }, { text: 'Outgoing', value: 'E' } ] },
  { question: 'Do you trust:', answers: [ { text: 'Experience', value: 'S' }, { text: 'Instinct', value: 'N' } ] },
  { question: 'Do you value more:', answers: [ { text: 'Justice', value: 'T' }, { text: 'Mercy', value: 'F' } ] },
  { question: 'Do you like to:', answers: [ { text: 'Finish tasks', value: 'J' }, { text: 'Start new things', value: 'P' } ] },
  { question: 'Are you more likely to:', answers: [ { text: 'Listen', value: 'I' }, { text: 'Speak', value: 'E' } ] },
  { question: 'Do you prefer:', answers: [ { text: 'Facts', value: 'S' }, { text: 'Ideas', value: 'N' } ] },
  { question: 'Do you make decisions with:', answers: [ { text: 'Head', value: 'T' }, { text: 'Heart', value: 'F' } ] },
  { question: 'Do you like to:', answers: [ { text: 'Plan', value: 'J' }, { text: 'Improvise', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Quiet', value: 'I' }, { text: 'Talkative', value: 'E' } ] },
  { question: 'Do you focus on:', answers: [ { text: 'Present', value: 'S' }, { text: 'Future', value: 'N' } ] },
  { question: 'Do you value:', answers: [ { text: 'Truth', value: 'T' }, { text: 'Compassion', value: 'F' } ] },
  { question: 'Do you prefer:', answers: [ { text: 'Order', value: 'J' }, { text: 'Freedom', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Reflective', value: 'I' }, { text: 'Active', value: 'E' } ] },
  { question: 'Do you trust:', answers: [ { text: 'What you see', value: 'S' }, { text: 'What you imagine', value: 'N' } ] },
  { question: 'Do you value:', answers: [ { text: 'Fairness', value: 'T' }, { text: 'Empathy', value: 'F' } ] },
  { question: 'Do you like to:', answers: [ { text: 'Complete projects', value: 'J' }, { text: 'Start projects', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Private', value: 'I' }, { text: 'Open', value: 'E' } ] },
  { question: 'Do you focus on:', answers: [ { text: 'Reality', value: 'S' }, { text: 'Possibility', value: 'N' } ] },
  { question: 'Do you make decisions based on:', answers: [ { text: 'Principles', value: 'T' }, { text: 'People', value: 'F' } ] },
  { question: 'Do you prefer:', answers: [ { text: 'Schedules', value: 'J' }, { text: 'No plans', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Reserved in groups', value: 'I' }, { text: 'Social in groups', value: 'E' } ] },
  { question: 'Do you trust:', answers: [ { text: 'Experience', value: 'S' }, { text: 'Intuition', value: 'N' } ] },
  { question: 'Do you value:', answers: [ { text: 'Logic', value: 'T' }, { text: 'Feelings', value: 'F' } ] },
  { question: 'Do you like to:', answers: [ { text: 'Organize', value: 'J' }, { text: 'Adapt', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Introspective', value: 'I' }, { text: 'Expressive', value: 'E' } ] },
  { question: 'Do you focus on:', answers: [ { text: 'What is', value: 'S' }, { text: 'What could be', value: 'N' } ] },
  { question: 'Do you make decisions with:', answers: [ { text: 'Reason', value: 'T' }, { text: 'Emotion', value: 'F' } ] },
  { question: 'Do you prefer:', answers: [ { text: 'Plans', value: 'J' }, { text: 'Options', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Withdrawn', value: 'I' }, { text: 'Outgoing', value: 'E' } ] },
  { question: 'Do you trust:', answers: [ { text: 'Facts', value: 'S' }, { text: 'Hunches', value: 'N' } ] },
  { question: 'Do you value:', answers: [ { text: 'Justice', value: 'T' }, { text: 'Kindness', value: 'F' } ] },
  { question: 'Do you like to:', answers: [ { text: 'Finish things', value: 'J' }, { text: 'Start things', value: 'P' } ] },
  { question: 'Are you more:', answers: [ { text: 'Reserved with strangers', value: 'I' }, { text: 'Friendly with strangers', value: 'E' } ] },
  { question: 'Do you focus on:', answers: [ { text: 'What is real', value: 'S' }, { text: 'What is possible', value: 'N' } ] },
  { question: 'Do you make decisions based on:', answers: [ { text: 'Rules', value: 'T' }, { text: 'Circumstances', value: 'F' } ] },
  { question: 'Do you prefer:', answers: [ { text: 'Routine', value: 'J' }, { text: 'Change', value: 'P' } ] },
];

// Enneagram Questions (50)
const enneagramQuestions = [
  { question: 'Which describes you best?', answers: [ { text: 'I seek security and support', value: '6' }, { text: 'I strive for uniqueness and authenticity', value: '4' } ] },
  { question: 'Do you often:', answers: [ { text: 'Help others before yourself', value: '2' }, { text: 'Focus on your own goals', value: '3' } ] },
  { question: 'Are you more:', answers: [ { text: 'Perfectionistic', value: '1' }, { text: 'Easygoing', value: '9' } ] },
  { question: 'Do you react to stress by:', answers: [ { text: 'Becoming anxious', value: '6' }, { text: 'Withdrawing', value: '5' } ] },
  { question: 'Do you value:', answers: [ { text: 'Success', value: '3' }, { text: 'Peace', value: '9' } ] },
  { question: 'Are you more:', answers: [ { text: 'Challenging', value: '8' }, { text: 'Supportive', value: '2' } ] },
  { question: 'Do you prefer:', answers: [ { text: 'Structure', value: '1' }, { text: 'Flexibility', value: '7' } ] },
  { question: 'Are you:', answers: [ { text: 'Driven by fear', value: '6' }, { text: 'Driven by desire', value: '7' } ] },
  { question: 'Do you often feel:', answers: [ { text: 'Misunderstood', value: '4' }, { text: 'Content', value: '9' } ] },
  { question: 'Are you more:', answers: [ { text: 'Assertive', value: '8' }, { text: 'Reserved', value: '5' } ] },
  // ... 40 more Enneagram questions ...
];

// Love Language Questions (50)
const loveLanguageQuestions = [
  { question: 'What makes you feel most loved?', answers: [ { text: 'Words of affirmation', value: 'Words' }, { text: 'Physical touch', value: 'Touch' }, { text: 'Quality time', value: 'Time' }, { text: 'Acts of service', value: 'Service' }, { text: 'Receiving gifts', value: 'Gifts' } ] },
  { question: 'You prefer your partner to:', answers: [ { text: 'Say "I love you" often', value: 'Words' }, { text: 'Give you a hug', value: 'Touch' } ] },
  { question: 'You feel closest when:', answers: [ { text: 'Spending time together', value: 'Time' }, { text: 'Receiving a thoughtful gift', value: 'Gifts' } ] },
  { question: 'You appreciate:', answers: [ { text: 'Help with chores', value: 'Service' }, { text: 'A surprise note', value: 'Words' } ] },
  { question: 'You value:', answers: [ { text: 'Holding hands', value: 'Touch' }, { text: 'A long conversation', value: 'Time' } ] },
  { question: 'You feel loved when:', answers: [ { text: 'Given a present', value: 'Gifts' }, { text: 'Someone does something for you', value: 'Service' } ] },
  { question: 'You prefer:', answers: [ { text: 'A back rub', value: 'Touch' }, { text: 'A compliment', value: 'Words' } ] },
  { question: 'You notice love in:', answers: [ { text: 'Actions', value: 'Service' }, { text: 'Time spent', value: 'Time' } ] },
  { question: 'You cherish:', answers: [ { text: 'A surprise gift', value: 'Gifts' }, { text: 'A warm embrace', value: 'Touch' } ] },
  { question: 'You feel special when:', answers: [ { text: 'You are told so', value: 'Words' }, { text: 'You are helped', value: 'Service' } ] },
  // ... 40 more Love Language questions ...
];

// Emotional Questions (50)
const emotionalQuestions = [
  { question: 'How do you handle conflict?', answers: [ { text: 'Talk it out immediately', value: 'Direct' }, { text: 'Take time to process alone', value: 'Reflective' }, { text: 'Try to keep the peace', value: 'Peacemaker' } ] },
  { question: 'You are more likely to:', answers: [ { text: 'Express your feelings', value: 'Expressive' }, { text: 'Keep feelings to yourself', value: 'Reserved' } ] },
  { question: 'When upset, you:', answers: [ { text: 'Confront the issue', value: 'Direct' }, { text: 'Withdraw', value: 'Reflective' } ] },
  { question: 'You value:', answers: [ { text: 'Emotional honesty', value: 'Expressive' }, { text: 'Harmony', value: 'Peacemaker' } ] },
  { question: 'You are:', answers: [ { text: 'Empathetic', value: 'Peacemaker' }, { text: 'Analytical', value: 'Direct' } ] },
  { question: 'You prefer:', answers: [ { text: 'Open communication', value: 'Expressive' }, { text: 'Avoiding conflict', value: 'Peacemaker' } ] },
  { question: 'You are more:', answers: [ { text: 'Sensitive', value: 'Reflective' }, { text: 'Assertive', value: 'Direct' } ] },
  { question: 'You handle stress by:', answers: [ { text: 'Talking to someone', value: 'Expressive' }, { text: 'Spending time alone', value: 'Reflective' } ] },
  { question: 'You value:', answers: [ { text: 'Understanding', value: 'Peacemaker' }, { text: 'Clarity', value: 'Direct' } ] },
  { question: 'You are:', answers: [ { text: 'Calm', value: 'Peacemaker' }, { text: 'Passionate', value: 'Expressive' } ] },
  // ... 40 more Emotional questions ...
];

// Psychological Questions (50)
const psychologicalQuestions = [
  { question: 'I enjoy solving complex problems and puzzles.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I often reflect on my thoughts and feelings.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I prefer planning things out rather than being spontaneous.', answers: [ { text: 'Plan', value: 'Plan' }, { text: 'Spontaneous', value: 'Spontaneous' } ] },
  { question: 'I find it easy to adapt to new situations.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable expressing my emotions to others.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I like to analyze situations before making decisions.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am energized by spending time alone.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I often seek out new experiences.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am good at understanding other people\'s perspectives.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I prefer routine over change.', answers: [ { text: 'Routine', value: 'Routine' }, { text: 'Change', value: 'Change' } ] },
  { question: 'I am comfortable taking risks.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I enjoy deep, meaningful conversations.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I tend to notice details that others might miss.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am quick to forgive others.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I often think about the future.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable with uncertainty.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I enjoy working in teams.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am sensitive to the moods of people around me.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I like to set goals for myself.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am open to feedback and criticism.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I prefer to focus on one task at a time.', answers: [ { text: 'One task', value: 'One' }, { text: 'Multitask', value: 'Multi' } ] },
  { question: 'I am motivated by challenges.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I find it easy to stay calm under pressure.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I enjoy learning about psychology and human behavior.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable with silence in conversations.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I like to keep my options open.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am persistent when working towards a goal.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I value honesty over harmony.', answers: [ { text: 'Honesty', value: 'Honesty' }, { text: 'Harmony', value: 'Harmony' } ] },
  { question: 'I am curious about how things work.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I often help others solve their problems.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable being the center of attention.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I prefer to avoid conflict.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am good at reading between the lines.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I enjoy trying new hobbies or activities.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable making decisions quickly.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I value logic over emotions when making decisions.', answers: [ { text: 'Logic', value: 'Logic' }, { text: 'Emotions', value: 'Emotions' } ] },
  { question: 'I am good at managing my time.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I often reflect on my past experiences.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable asking for help when I need it.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I enjoy discussing abstract ideas.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am good at setting boundaries with others.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I prefer to follow my intuition.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable with change.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I enjoy helping others grow and develop.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am good at recognizing my own strengths and weaknesses.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I prefer to work independently.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am comfortable expressing disagreement.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I enjoy exploring new places.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I am good at staying organized.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'I value personal growth and self-improvement.', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
];

const categories = [
  { type: 'MBTI', questions: mbtiQuestions },
  { type: 'Enneagram', questions: enneagramQuestions },
  { type: 'Love Language', questions: loveLanguageQuestions },
  { type: 'Emotional', questions: emotionalQuestions },
  { type: 'Psychological', questions: psychologicalQuestions },
];

function getRandomQuestions() {
  // Pick 1 random question from each category (as originally designed)
  return categories.map(cat => {
    const idx = Math.floor(Math.random() * cat.questions.length);
    return { ...cat.questions[idx], type: cat.type };
  });
}

// Calculation functions for quiz results
// Note: Quiz shows 5 questions (1 from each category), so answers array has 5 elements
function calculateMBTI(answers, quizQuestions) {
  // Find the MBTI question and its answer (single letter: E, I, S, N, T, F, J, or P)
  let mbtiIdx = -1;
  quizQuestions.forEach((q, idx) => {
    if (q.type === 'MBTI' && mbtiIdx === -1) {
      mbtiIdx = idx;
    }
  });
  
  if (mbtiIdx === -1 || !answers[mbtiIdx]) return 'I'; // Default fallback (single letter)
  
  const singleLetter = answers[mbtiIdx];
  
  // Return the single letter as-is - the backend will handle compatibility scoring
  // with single letters using simpler logic (60-75 range based on complementarity)
  return singleLetter;
}

function calculateEnneagram(answers, quizQuestions) {
  // Find the Enneagram question and its answer
  let enneagramIdx = -1;
  quizQuestions.forEach((q, idx) => {
    if (q.type === 'Enneagram' && enneagramIdx === -1) {
      enneagramIdx = idx;
    }
  });
  
  if (enneagramIdx === -1 || !answers[enneagramIdx]) return 'Type 9'; // Default fallback
  
  const answer = answers[enneagramIdx];
  // The answer should be the type number (e.g., '1', '2', '9')
  return answer ? `Type ${answer}` : 'Type 9';
}

function calculateLoveLanguage(answers, quizQuestions) {
  // Find the Love Language question and its answer
  let loveLangIdx = -1;
  quizQuestions.forEach((q, idx) => {
    if (q.type === 'Love Language' && loveLangIdx === -1) {
      loveLangIdx = idx;
    }
  });
  
  if (loveLangIdx === -1 || !answers[loveLangIdx]) return 'Words of Affirmation'; // Default fallback
  
  const answer = answers[loveLangIdx];
  // Map answer values to full love language names
  const loveLangMap = {
    'Words': 'Words of Affirmation',
    'Touch': 'Physical Touch',
    'Time': 'Quality Time',
    'Service': 'Acts of Service',
    'Gifts': 'Receiving Gifts'
  };
  
  return loveLangMap[answer] || answer || 'Words of Affirmation';
}

function calculatePsychologicalTraits(answers, quizQuestions) {
  // Find the Psychological question and its answer
  let psychIdx = -1;
  quizQuestions.forEach((q, idx) => {
    if (q.type === 'Psychological' && psychIdx === -1) {
      psychIdx = idx;
    }
  });
  
  if (psychIdx === -1 || !answers[psychIdx]) {
    // Return default traits if no answer
    return {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50
    };
  }
  
  const answer = answers[psychIdx];
  const traits = {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50
  };
  
  // Score based on the answer - add some variation
  // This is a simplified scoring since we only have 1 psychological question
  if (answer === 'Yes') {
    traits.openness += 20;
    traits.conscientiousness += 10;
    traits.extraversion += 15;
  } else if (answer === 'No') {
    traits.openness -= 10;
    traits.conscientiousness += 15;
    traits.extraversion -= 10;
  } else if (answer === 'Plan') {
    traits.conscientiousness += 25;
    traits.openness += 5;
  } else if (answer === 'Spontaneous') {
    traits.openness += 25;
    traits.conscientiousness -= 10;
  } else if (answer === 'Logic') {
    traits.openness += 15;
    traits.conscientiousness += 20;
  } else if (answer === 'Emotions') {
    traits.agreeableness += 20;
    traits.extraversion += 15;
  }
  
  // Normalize to 0-100 scale
  Object.keys(traits).forEach(key => {
    traits[key] = Math.max(0, Math.min(100, traits[key]));
  });
  
  return traits;
}

function FloatingShapes({ parallax = 1 }) {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 12000 + i * 2000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    });
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => {
        const x = anim.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.7 * parallax] });
        const y = anim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.1 * i, height * 0.7 * parallax] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: i === 0 ? 20 : i === 1 ? width - 120 : width / 2,
              top: i === 2 ? height * 0.7 : 40 + i * 80,
              width: 120 - i * 30,
              height: 120 - i * 30,
              borderRadius: 60 - i * 15,
              backgroundColor: 'rgba(224,224,224,0.07)',
              opacity: 0.5 - i * 0.1,
              transform: [{ translateX: x }, { translateY: y }],
              zIndex: -10,
            }}
          />
        );
      })}
    </View>
  );
}

function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#18181b', '#23232b', '#18181b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

export default function QuizScreen({ navigation }) {
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // --- ANIMATION VALUES ---
  const cardAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current; // goes from 0 to 1, used for scaleX only
  const progressPulse = useRef(new Animated.Value(1)).current; // scaleY: true
  const progressGlow = useRef(new Animated.Value(0)).current; // for glow effect
  const progressGlow2 = useRef(new Animated.Value(0)).current; // for second, larger glow
  const morphAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [answerAnims, setAnswerAnims] = useState([]);

  useEffect(() => {
    setQuizQuestions(getRandomQuestions());
  }, []);

  useEffect(() => {
    if (quizQuestions.length > 0) {
      setAnswerAnims(
        quizQuestions[current]?.answers.map(() => new Animated.Value(0)) || []
      );
    }
  }, [quizQuestions, current]);

  useEffect(() => {
    // Animate question card pop
    cardAnim.setValue(0);
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();

    // Staggered answer buttons
    answerAnims.forEach(anim => anim.setValue(0));
    Animated.stagger(120, answerAnims.map(anim =>
      Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true })
    )).start();

    // Progress bar animation (scaleX only, 0 to 1)
    Animated.timing(progressAnim, {
      toValue: (current + 1) / (quizQuestions.length || 1),
      duration: 500,
      useNativeDriver: true,
      easing: Easing.out(Easing.exp),
    }).start();

    // Progress bar pulse (scaleY is transform)
    progressPulse.setValue(1.2);
    Animated.spring(progressPulse, { toValue: 1, useNativeDriver: true, friction: 3 }).start();

    // Progress bar glow pulse (two layers)
    progressGlow.setValue(0.7);
    progressGlow2.setValue(0.7);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(progressGlow, { toValue: 2, duration: 400, useNativeDriver: true }),
        Animated.timing(progressGlow, { toValue: 1, duration: 400, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.timing(progressGlow2, { toValue: 2.3, duration: 400, useNativeDriver: true }),
        Animated.timing(progressGlow2, { toValue: 1, duration: 400, useNativeDriver: true })
      ])
    ]).start();
  }, [current, answerAnims, quizQuestions.length]);

  useEffect(() => {
    // Animated dots for calculating (opacity/rotate: useNativeDriver: true)
    Animated.loop(
      Animated.timing(dotAnim, { toValue: 3, duration: 1200, useNativeDriver: true })
    ).start();
    // Morphing icon (transform: true)
    Animated.loop(
      Animated.sequence([
        Animated.timing(morphAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(morphAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);


  const handleAnswer = async (answer, idx) => {
  // ⛔ If already calculating, do nothing
  if (calculating) return;

  Animated.sequence([
    Animated.spring(answerAnims[idx], { toValue: 1.2, useNativeDriver: true }),
    Animated.spring(answerAnims[idx], { toValue: 1, useNativeDriver: true }),
  ]).start();

  // ✅ LAST QUESTION — HARD STOP HERE
  if (current === quizQuestions.length - 1) {
    setCalculating(true);

    const allAnswers = [...answers, answer];
    setAnswers(allAnswers);

    // 🔥 EXIT IMMEDIATELY — NO MORE CODE BELOW RUNS
    setTimeout(async () => {
      await AsyncStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(allAnswers));

      try {
        const token = await AsyncStorage.getItem('auth_token');
        // Get zodiac sign from AsyncStorage if zodiac quiz was completed
        const zodiacSign = await AsyncStorage.getItem('user_zodiac_sign') || null;
        
        await fetch(`${API_BASE_URL}/api/quiz/submit`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mbti_type: calculateMBTI(allAnswers, quizQuestions),
            enneagram_type: calculateEnneagram(allAnswers, quizQuestions),
            love_language: calculateLoveLanguage(allAnswers, quizQuestions),
            psychological_traits: calculatePsychologicalTraits(allAnswers, quizQuestions),
            zodiac_sign: zodiacSign, // Use zodiac from zodiac quiz, or null if not taken
            zodiac_answers: {},
          }),
        });
      } catch (error) {
        console.error('Error submitting quiz:', error);
      }

      await AsyncStorage.setItem('hasTakenZodiacQuiz', 'true');

      setCalculating(false);

      const randomScore = Math.floor(60 + Math.random() * 40);
      setScore(randomScore);
      setShowScore(true);
      setShowConfetti(true);

      scoreAnim.setValue(0);
      Animated.timing(scoreAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
      easing: Easing.bounce,
      }).start(() => {
    setTimeout(() => {
    setShowConfetti(false);
    navigation.replace('MainTabs'); // ✅ GO HOME
  }, 2000);
});
    }, 1200);

    return; 
  }

  setTimeout(() => {
    setAnswers([...answers, answer]);
    setCurrent(current + 1);
  }, 250);
};


  // Animated dots for calculating
  const dots = [0, 1, 2].map(i => (
    <Animated.Text
      key={i}
      style={{
        opacity: dotAnim.interpolate({
          inputRange: [i, i + 1],
          outputRange: [0.2, 1],
          extrapolate: 'clamp',
        }),
        color: '#e0e0e0',
        fontSize: 32,
        fontWeight: 'bold',
      }}>
      .
    </Animated.Text>
  ));

  // Morphing heart/circle
  const morphScale = morphAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const morphBorder = morphAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 70] });

  // Defensive: ensure q is only set if quizQuestions is a non-empty array
  const q = Array.isArray(quizQuestions) && quizQuestions.length > 0 ? quizQuestions[current] : null;

  if (quizQuestions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Background />
        <FloatingShapes parallax={1} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#bdbdbd" />
        </View>
      </SafeAreaView>
    );
  }

  if (calculating) {
    return (
      <SafeAreaView style={styles.container}>
        <Background />
        <FloatingShapes parallax={1.2} />
        <View style={styles.centered}>
          {/* Morphing heart/circle - use scale, not width/height animation */}
          <Animated.View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#e0e0e0',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            opacity: 0.15,
            alignSelf: 'center',
            transform: [{ scale: morphScale }]
          }}>
            <FontAwesome name="heart" size={36} color="#e0e0e0" style={{ opacity: 0.7 }} />
          </Animated.View>
          {/* Animated dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#e0e0e0', fontSize: 32, fontWeight: 'bold' }}>Calculating</Text>
            {dots}
          </View>
          {/* Progress circle */}
          <Animated.View style={{
            marginTop: 30,
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 6,
            borderColor: '#e0e0e0',
            borderRightColor: 'transparent',
            borderLeftColor: '#bdbdbd',
            borderBottomColor: 'transparent',
            alignSelf: 'center',
            transform: [{
              rotate: dotAnim.interpolate({
                inputRange: [0, 3],
                outputRange: ['0deg', '360deg']
              })
            }]
          }} />
        </View>
      </SafeAreaView>
    );
  }

  if (showScore) {
    return (
      <SafeAreaView style={styles.container}>
        <Background />
        <FloatingShapes parallax={0.8} />
        <View style={styles.centered}>
          {/* Glow behind score */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: '#e0e0e0',
              opacity: scoreAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.32] }),
              zIndex: -1,
            }}
          />
          {/* Score with bounce */}
          <Animated.Text style={{
            color: '#e0e0e0',
            fontWeight: 'bold',
            fontSize: 60,
            marginBottom: 10,
            transform: [
              {
                scale: scoreAnim.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0.7, 1.2, 1],
                }),
              },
            ],
          }}>
            {score}%
          </Animated.Text>
          <Text style={styles.scoreLabel}>Your DeepMatch Score</Text>
          {/* Confetti */}
          {showConfetti && (
            <ConfettiCannon
              count={30}
              origin={{ x: width / 2, y: 0 }}
              fadeOut
              fallSpeed={2500}
              explosionSpeed={350}
              colors={['#fff', '#e0e0e0', '#bdbdbd']}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <Background />
      <FloatingShapes parallax={1 + current * 0.05} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', width: '100%' }}>
          {/* Lottie Glow Animation ABOVE the progress bar with space */}
          <View style={{ width: width * 0.8, alignSelf: 'center', marginTop: 30 }}>
            <View style={{ width: '100%', height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <LottieWrapper
                source={require('../assets/animations/glow-bar.json')}
                autoPlay
                loop
                style={{ width: '100%', height: 40 }}
                resizeMode="cover"
              />
            </View>
            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    transform: [
                      { scaleX: progressAnim },
                      { scaleY: progressPulse }
                    ]
                  }
                ]}
              />
            </View>
          </View>
          {/* Question Card Pop */}
          <Animated.View
            style={{
              opacity: cardAnim,
              width: width * 0.9,
              alignSelf: 'center',
              transform: [
                { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
              ],
            }}
          >
            <Text style={styles.questionType}>{q ? `${q.type} Quiz` : ''}</Text>
            <Text style={styles.question}>{q ? q.question : ''}</Text>
            <View style={styles.answersContainer}>
              {q && q.answers && q.answers.map((a, idx) => (
                <Animated.View
                  key={a.value}
                  style={[
                    styles.answerWrapper,
                    {
                      opacity: answerAnims[idx] || 1,
                      transform: [
                        { translateY: answerAnims[idx] ? answerAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) : 0 },
                        { scale: answerAnims[idx] || 1 }
                      ],
                    },
                  ]}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.answerBtn,
                      pressed && { backgroundColor: '#2a2a2f' }
                    ]}
                    android_ripple={{ color: '#e0e0e0', borderless: false }}
                    onPress={() => handleAnswer(a.value, idx)}
                  >
                    <Ionicons name="ellipse" size={20} color="#bdbdbd" style={{ marginRight: 10 }} />
                    <Text style={styles.answerText}>{a.text}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 10,
    width: '100%',
    backgroundColor: '#23232b',
    borderRadius: 8,
    alignSelf: 'center',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    width: '100%', // static width, only scaleX is animated
  },
  questionType: {
    color: '#e0e0e0',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  question: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  answersContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  answerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#23232b',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginVertical: 10,
    width: width * 0.7,
    shadowColor: '#bdbdbd',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  answerText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
}); 