import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, SafeAreaView, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import LottieWrapper from '../components/lottie/LottieWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Import all zodiac icon components at the top:
import AriesIcon from '../components/zodiac/AriesIcon';
import TaurusIcon from '../components/zodiac/TaurusIcon';
import GeminiIcon from '../components/zodiac/GeminiIcon';
import CancerIcon from '../components/zodiac/CancerIcon';
import LeoIcon from '../components/zodiac/LeoIcon';
import VirgoIcon from '../components/zodiac/VirgoIcon';
import LibraIcon from '../components/zodiac/LibraIcon';
import ScorpioIcon from '../components/zodiac/ScorpioIcon';
import SagittariusIcon from '../components/zodiac/SagittariusIcon';
import CapricornIcon from '../components/zodiac/CapricornIcon';
import AquariusIcon from '../components/zodiac/AquariusIcon';
import PiscesIcon from '../components/zodiac/PiscesIcon';

const { width, height } = Dimensions.get('window');
const ZODIAC_QUIZ_STORAGE_KEY = 'user_zodiac_quiz_results';
const COMPATIBLE_ZODIAC_KEY = 'user_compatible_zodiac';
const API_BASE_URL = 'https://deepmatch.onrender.com';

const zodiacQuestions = [
  { question: 'What is your zodiac sign?', answers: [ { text: 'Aries', value: 'Aries' }, { text: 'Taurus', value: 'Taurus' }, { text: 'Gemini', value: 'Gemini' }, { text: 'Cancer', value: 'Cancer' }, { text: 'Leo', value: 'Leo' }, { text: 'Virgo', value: 'Virgo' }, { text: 'Libra', value: 'Libra' }, { text: 'Scorpio', value: 'Scorpio' }, { text: 'Sagittarius', value: 'Sagittarius' }, { text: 'Capricorn', value: 'Capricorn' }, { text: 'Aquarius', value: 'Aquarius' }, { text: 'Pisces', value: 'Pisces' } ] },
  { question: 'Do you believe in astrology?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you read your horoscope regularly?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Which element do you feel most connected to?', answers: [ { text: 'Fire', value: 'Fire' }, { text: 'Earth', value: 'Earth' }, { text: 'Air', value: 'Air' }, { text: 'Water', value: 'Water' } ] },
  { question: 'Do you prefer day or night?', answers: [ { text: 'Day', value: 'Day' }, { text: 'Night', value: 'Night' } ] },
  { question: 'Are you more introverted or extroverted?', answers: [ { text: 'Introverted', value: 'Introverted' }, { text: 'Extroverted', value: 'Extroverted' } ] },
  { question: 'Do you consider yourself emotional?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you like to take the lead in group situations?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you a planner or do you go with the flow?', answers: [ { text: 'Planner', value: 'Planner' }, { text: 'Go with the flow', value: 'Flow' } ] },
  { question: 'Do you enjoy being the center of attention?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you more logical or creative?', answers: [ { text: 'Logical', value: 'Logical' }, { text: 'Creative', value: 'Creative' } ] },
  { question: 'Do you value tradition or innovation more?', answers: [ { text: 'Tradition', value: 'Tradition' }, { text: 'Innovation', value: 'Innovation' } ] },
  { question: 'Do you prefer stability or excitement?', answers: [ { text: 'Stability', value: 'Stability' }, { text: 'Excitement', value: 'Excitement' } ] },
  { question: 'Are you more forgiving or hold grudges?', answers: [ { text: 'Forgiving', value: 'Forgiving' }, { text: 'Hold grudges', value: 'Grudge' } ] },
  { question: 'Do you like to travel?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you a risk-taker?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you prefer to work alone or in a team?', answers: [ { text: 'Alone', value: 'Alone' }, { text: 'Team', value: 'Team' } ] },
  { question: 'Are you more practical or idealistic?', answers: [ { text: 'Practical', value: 'Practical' }, { text: 'Idealistic', value: 'Idealistic' } ] },
  { question: 'Do you enjoy helping others?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you sensitive to criticism?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you prefer routine or spontaneity?', answers: [ { text: 'Routine', value: 'Routine' }, { text: 'Spontaneity', value: 'Spontaneity' } ] },
  { question: 'Are you detail-oriented?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you enjoy social gatherings?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you a good listener?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you like to try new things?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you patient?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you prefer to lead or follow?', answers: [ { text: 'Lead', value: 'Lead' }, { text: 'Follow', value: 'Follow' } ] },
  { question: 'Are you optimistic?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you enjoy learning about new cultures?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you competitive?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you value honesty?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you adaptable?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you enjoy outdoor activities?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you a perfectionist?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you like to express yourself creatively?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you a morning person?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you enjoy reading?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you good at keeping secrets?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you prefer city or countryside?', answers: [ { text: 'City', value: 'City' }, { text: 'Countryside', value: 'Countryside' } ] },
  { question: 'Are you spontaneous?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you enjoy cooking?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you organized?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you like to set goals?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you sensitive to others feelings?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you enjoy music?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you ambitious?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you like to plan ahead?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you loyal?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you enjoy sports?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Are you romantic?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
  { question: 'Do you like surprises?', answers: [ { text: 'Yes', value: 'Yes' }, { text: 'No', value: 'No' } ] },
];

const zodiacSigns = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const zodiacSignQuestion = {
  question: 'What is your zodiac sign?',
  answers: zodiacSigns.map(sign => ({ text: sign, value: sign }))
};

function getRandomQuestions() {
  // Always start with the zodiac sign question, then 4 random others
  const others = zodiacQuestions.filter(q => q.question !== zodiacSignQuestion.question);
  const shuffled = others.sort(() => 0.5 - Math.random());
  return [zodiacSignQuestion, ...shuffled.slice(0, 4)];
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

export default function ZodiacQuizScreen({ navigation }) {
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
  const morphAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [answerAnims, setAnswerAnims] = useState([]);

  const [compatibleSign, setCompatibleSign] = useState(null);
  const animatedZodiacScale = useRef(new Animated.Value(1)).current;

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

  // 3. Animate the zodiac icon when showScore is true:
  useEffect(() => {
    if (showScore && compatibleSign) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedZodiacScale, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(animatedZodiacScale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      animatedZodiacScale.setValue(1);
    }
  }, [showScore, compatibleSign]);

  const handleAnswer = (answer, idx) => {
    // Button bounce (transform: true)
    Animated.sequence([
      Animated.spring(answerAnims[idx], { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(answerAnims[idx], { toValue: 1, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      if (current < quizQuestions.length - 1) {
        setAnswers([...answers, answer]);
        setCurrent(current + 1);
      } else {
        // Last question, show calculating and send answers to backend
        const allAnswers = [...answers, answer];
        setAnswers(allAnswers);
        setCalculating(true);
        setTimeout(async () => {
          try {
            // User's own zodiac sign is the first answer
            const userSign = allAnswers[0];
            let compatible = null;

            try {
              const token = await AsyncStorage.getItem('auth_token');
              if (token) {
                const response = await fetch(`${API_BASE_URL}/api/zodiac-quiz`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    zodiac_sign: userSign,
                    answers: allAnswers,
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  compatible = data.compatible_sign || null;
                } else {
                  console.error('Zodiac quiz submit failed with status:', response.status);
                }
              }
            } catch (err) {
              console.error('Error sending zodiac quiz to backend:', err);
            }

            if (!compatible) {
              // Fallback if backend did not return anything
              compatible = 'Leo';
            }

            setCompatibleSign(compatible);

            // Save zodiac sign and compatible sign locally for filters on HomeScreen
            try {
              await AsyncStorage.setItem(
                COMPATIBLE_ZODIAC_KEY,
                JSON.stringify({ userSign, compatible })
              );
              // Also save user's zodiac sign separately for quiz submission
              await AsyncStorage.setItem('user_zodiac_sign', userSign);
            } catch (err) {
              console.error('Error saving compatible zodiac locally:', err);
            }

            // Also keep original quiz answers if needed later
            try {
              await AsyncStorage.setItem(
                ZODIAC_QUIZ_STORAGE_KEY,
                JSON.stringify(allAnswers)
              );
            } catch (err) {
              console.error('Error saving zodiac quiz answers locally:', err);
            }

            // Show score / animation exactly as before
            const randomScore = Math.floor(60 + Math.random() * 40);
            setScore(randomScore);
            setShowScore(true);
            setShowConfetti(true);
            scoreAnim.setValue(0);
            Animated.parallel([
              Animated.timing(scoreAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
                easing: Easing.bounce,
              })
            ]).start(() => {
              setTimeout(() => {
              setShowConfetti(false);

  AsyncStorage.setItem('hasTakenZodiacQuiz', 'true');

  (async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/zodiac-quiz/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Failed to sync zodiac quiz completion:', err);
    }
  })();
  navigation.replace('MainTabs');
}, 4000);

 // Give more time to view the animation
            });
            // Now that result is visible, we can safely turn off calculating
            setCalculating(false);
          } catch (err) {
            console.error('Unexpected error in zodiac quiz completion:', err);
            setCalculating(false);
          }
        }, 1800);
      }
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

  // 5. Helper to get the correct animated zodiac icon:
  const zodiacAnimatedIcons = {
    Aries: AriesIcon,
    Taurus: TaurusIcon,
    Gemini: GeminiIcon,
    Cancer: CancerIcon,
    Leo: LeoIcon,
    Virgo: VirgoIcon,
    Libra: LibraIcon,
    Scorpio: ScorpioIcon,
    Sagittarius: SagittariusIcon,
    Capricorn: CapricornIcon,
    Aquarius: AquariusIcon,
    Pisces: PiscesIcon,
  };

  // 6. Show result FIRST so there's no flicker when switching from calculating
  if (showScore && compatibleSign) {
    const ZodiacIcon = zodiacAnimatedIcons[compatibleSign] || AriesIcon;
    return (
      <SafeAreaView style={styles.container}>
        <Background />
        <FloatingShapes parallax={0.8} />
        <View style={styles.centered}>
          {/* Glow behind sign */}
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
          {/* Animated Zodiac Icon */}
          <Animated.View style={{ transform: [{ scale: animatedZodiacScale }], marginBottom: 20 }}>
            <ZodiacIcon width={120} height={120} />
          </Animated.View>
          <Animated.Text style={{
            color: '#e0e0e0',
            fontWeight: 'bold',
            fontSize: 40,
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
            {compatibleSign}
          </Animated.Text>
          <Text style={styles.scoreLabel}>Your Most Compatible Sign!</Text>
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

  if (calculating) {
    return (
      <SafeAreaView style={styles.container}>
        <Background />
        <FloatingShapes parallax={1.2} />
        <View style={styles.centered}>
          {/* Morphing heart/circle */}
          <Animated.View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#e0e0e0',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              opacity: 0.15,
              alignSelf: 'center',
              transform: [{ scale: morphScale }],
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

  return (
    <SafeAreaView style={styles.container}>
      <Background />
      <FloatingShapes parallax={1 + current * 0.05} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', width: '100%' }}>
          {/* Lottie Zodiac Animation ABOVE the progress bar with space */}
          <View style={{ width: width * 0.8, alignSelf: 'center', marginTop: 30 }}>
            <View style={{ width: '100%', height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
              <LottieWrapper
                source={require('../assets/animations/zodiac.json')}
                autoPlay
                loop
                style={{ width: 140, height: 140 }}
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
            <Text style={styles.questionType}>Zodiac Quiz</Text>
            <Text style={styles.question}>{q ? q.question : ''}</Text>
            {/* Scrollable answers for the first question (zodiac sign selection) */}
            {current === 0 ? (
              <ScrollView style={{ maxHeight: 320, width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 10 }}>
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
              </ScrollView>
            ) : (
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
            )}
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