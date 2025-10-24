import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ActivityIndicator } from 'react-native';
import Svg, { Rect, Polygon, Path } from 'react-native-svg';
import LightRays from '../components/backgrounds/LightRays';

const DEFAULT_TIPS = [
  // --- Love Languages: Words of Affirmation ---
  "Tell your partner what you appreciate about them today.",
  "A simple 'I love you' can make someone's day.",
  "Leave a sweet note for your loved one to find.",
  "Compliment your partner on something non-physical.",
  "Express gratitude for the little things your partner does.",
  // --- Love Languages: Acts of Service ---
  "Do a chore your partner dislikes without being asked.",
  "Make your partner breakfast in bed.",
  "Offer to help with a task your partner is stressed about.",
  "Surprise your partner by running an errand for them.",
  "Prepare a relaxing evening for your loved one.",
  // --- Love Languages: Receiving Gifts ---
  "Give a small, meaningful gift just because.",
  "Create a handmade card for your partner.",
  "Pick up your partner's favorite snack on your way home.",
  "Gift an experience, not just an object.",
  "Wrap a present with extra care and a personal touch.",
  // --- Love Languages: Quality Time ---
  "Put away your phone and give your partner undivided attention.",
  "Plan a date night, even if it's at home.",
  "Take a walk together and talk about your day.",
  "Try a new activity together to create memories.",
  "Schedule regular check-ins to connect emotionally.",
  // --- Love Languages: Physical Touch ---
  "Hold hands while walking together.",
  "Give your partner a warm hug when you see them.",
  "Cuddle for a few minutes before getting out of bed.",
  "A gentle touch on the arm can show you care.",
  "Dance together, even if there's no music.",
  // --- Relationships: Communication ---
  "Listen to understand, not just to reply.",
  "Share your feelings honestly and kindly.",
  "Ask open-ended questions to deepen your connection.",
  "Apologize sincerely when you make a mistake.",
  "Practice active listening in every conversation.",
  // --- Relationships: Trust & Growth ---
  "Trust is built through consistency and honesty.",
  "Support your partner's dreams and ambitions.",
  "Celebrate each other's successes, big or small.",
  "Grow together by learning new things as a couple.",
  "Respect each other's boundaries and individuality.",
  // --- Relationships: Conflict Resolution ---
  "Address issues early, before they grow.",
  "Focus on the problem, not the person, during disagreements.",
  "Take a break if emotions run high, then revisit the issue calmly.",
  "Use 'I' statements to express your feelings.",
  "Remember, it's you and your partner vs. the problem, not each other.",
  // --- Self-Discovery & Self-Love ---
  "Love yourself first, and everything else falls into line.",
  "Take time for self-care and reflection.",
  "Your needs are important—don't neglect them.",
  "Embrace your uniqueness; it's your superpower.",
  "Growth comes from stepping outside your comfort zone.",
  // --- Enneagram & Personality ---
  "Type 1: Perfection is a direction, not a destination.",
  "Type 2: Your needs matter just as much as others'.",
  "Type 3: You are valued for who you are, not just what you achieve.",
  "Type 4: Your uniqueness is your strength.",
  "Type 5: It's okay to share your inner world with others.",
  "Type 6: Trust your inner guidance.",
  "Type 7: Joy is found in the present moment.",
  "Type 8: Vulnerability is a sign of strength.",
  "Type 9: Your voice deserves to be heard.",
  // --- Dating & New Relationships ---
  "Be yourself—authenticity attracts the right people.",
  "Take things slow and enjoy the journey.",
  "Ask questions to get to know your date deeply.",
  "Don't be afraid to set boundaries early on.",
  "Have fun and don't take things too seriously.",
  // --- Long-Term Relationships ---
  "Keep the romance alive with regular date nights.",
  "Surprise your partner with small acts of love.",
  "Grow together by setting shared goals.",
  "Laugh together often—humor strengthens bonds.",
  "Express appreciation daily.",
  // --- Emotional Intelligence ---
  "Recognize and name your emotions.",
  "Practice empathy in every interaction.",
  "Respond, don't react, to difficult situations.",
  "Take responsibility for your feelings and actions.",
  "Forgive yourself and others to move forward.",
  // --- Intimacy & Vulnerability ---
  "Share your fears and dreams with your partner.",
  "Let yourself be seen, flaws and all.",
  "Intimacy grows through honest conversations.",
  "Be open to giving and receiving love.",
  "Vulnerability is the gateway to deeper connection.",
  // --- Fun & Playfulness ---
  "Play a game together to spark joy.",
  "Try something silly and laugh together.",
  "Dance in the kitchen while cooking.",
  "Share a funny story from your day.",
  "Don't be afraid to be goofy with your partner.",
  // --- Mindfulness & Presence ---
  "Be present in the moment with your loved one.",
  "Practice gratitude for your relationship.",
  "Notice the little things your partner does.",
  "Take a few deep breaths together to reset.",
  "Slow down and savor your time together.",
  // --- Boundaries & Independence ---
  "Healthy boundaries create stronger relationships.",
  "It's okay to say no when you need to.",
  "Maintain your hobbies and friendships.",
  "Support each other's independence.",
  "Balance togetherness with alone time.",
  // --- Growth & Change ---
  "Embrace change as a couple—it leads to growth.",
  "Learn from challenges and celebrate progress.",
  "Check in regularly about your relationship goals.",
  "Be open to feedback from your partner.",
  "Celebrate how far you've come together.",
  // --- Miscellaneous ---
  "Never go to bed angry—talk it out.",
  "A relationship is a partnership, not a competition.",
  "Kindness is never wasted in love.",
  "Your relationship is unique—write your own story.",
  "Love is a verb—show it every day."
];

function getRandomTipIndex(lastIndex) {
  let idx = Math.floor(Math.random() * DEFAULT_TIPS.length);
  // Avoid repeating the last tip
  if (DEFAULT_TIPS.length > 1 && idx === lastIndex) {
    idx = (idx + 1) % DEFAULT_TIPS.length;
  }
  return idx;
}

export default function TipsScreen() {
  const [tipIndex, setTipIndex] = useState(() => getRandomTipIndex(-1));
  const [tip, setTip] = useState(DEFAULT_TIPS[tipIndex]);
  const [loading, setLoading] = useState(false);
  const [canTap, setCanTap] = useState(true);
  const [envelopeOpen, setEnvelopeOpen] = useState(false);

  const flapAnim = useRef(new Animated.Value(0)).current; // 0: closed, 1: open
  const tipAnim = useRef(new Animated.Value(0)).current; // 0: hidden, 1: out
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Show a new tip when the envelope is tapped
  const handleEnvelopeTap = () => {
    if (!canTap) return;
    setCanTap(false);
    setEnvelopeOpen(true);
    setLoading(false);

    // Animate flap open
    Animated.timing(flapAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    // Animate tip coming out of envelope
    tipAnim.setValue(0);
    fadeAnim.setValue(0);
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(tipAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // When the app is reopened, show a new random tip
  React.useEffect(() => {
    const unsubscribe = () => {
      // Reset envelope and show a new tip
      setEnvelopeOpen(false);
      setCanTap(true);
      setLoading(false);
      flapAnim.setValue(0);
      tipAnim.setValue(0);
      fadeAnim.setValue(0);
      const newIndex = getRandomTipIndex(tipIndex);
      setTipIndex(newIndex);
      setTip(DEFAULT_TIPS[newIndex]);
    };
    unsubscribe();
    return () => {};
  }, []);

  // When the envelope is closed and tapped again, show a new tip
  const handleTipBoxPress = () => {
    setEnvelopeOpen(false);
    setCanTap(true);
    setLoading(false);
    flapAnim.setValue(0);
    tipAnim.setValue(0);
    fadeAnim.setValue(0);
    const newIndex = getRandomTipIndex(tipIndex);
    setTipIndex(newIndex);
    setTip(DEFAULT_TIPS[newIndex]);
  };

  // Envelope flap rotation (closed: 0deg, open: -60deg)
  const flapRotate = flapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-60deg'],
  });
  // Tip box comes out of envelope (translateY: 60 -> 0)
  const tipTranslateY = tipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  return (
    <View style={styles.container}>
      {/* LightRays Background - Simplified configuration */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#e63946"
        raysSpeed={1.0}
        lightSpread={0.8}
        rayLength={1.0}
        followMouse={false}
        mouseInfluence={0.0}
        noiseAmount={0.0}
        distortion={0.0}
        style={{ zIndex: -1 }}
      />
      
      <View style={styles.glassCard}>
        <Text style={styles.title}>Tap the Envelope for Your Tip!</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleEnvelopeTap}
          disabled={!canTap || loading || envelopeOpen}
        >
          <View style={styles.envelopeContainer}>
            {/* Flap */}
            <Animated.View
              style={[
                styles.flapWrapper,
                { transform: [{ rotateX: flapRotate }] },
              ]}
            >
              <Svg width={120} height={35} viewBox="0 0 120 35">
                <Polygon
                  points="10,30 60,5 110,30"
                  fill="#fff"
                  stroke="#e63946"
                  strokeWidth="2"
                />
              </Svg>
            </Animated.View>
            {/* Envelope body */}
            <Svg width={120} height={60} viewBox="0 0 120 60" style={{ zIndex: 2 }}>
              <Rect
                x="10"
                y="0"
                width="100"
                height="50"
                rx="10"
                fill="#fff"
                stroke="#e63946"
                strokeWidth="2"
              />
              {/* Heart in the center */}
              <Path
                d="M60 25
                  C60 20, 70 20, 70 25
                  C70 30, 60 35, 60 40
                  C60 35, 50 30, 50 25
                  C50 20, 60 20, 60 25
                  Z"
                fill="#e63946"
                stroke="#e63946"
                strokeWidth="1"
              />
            </Svg>
          </View>
        </TouchableOpacity>
        {loading && <ActivityIndicator size="small" color="#e63946" style={{ marginTop: 20 }} />}
        {envelopeOpen && !loading && (
          <TouchableOpacity activeOpacity={0.8} onPress={handleTipBoxPress}>
            <Animated.View
              style={[
                styles.tipBox,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: tipTranslateY },
                  ],
                },
              ]}
            >
              <Text style={styles.tipText}>{tip}</Text>
              <Text style={{ fontSize: 13, color: '#888', marginTop: 10, textAlign: 'center' }}>
                Tap to get another tip
              </Text>
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Keep black background as fallback
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    width: 320,
    minHeight: 350,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    shadowColor: '#e63946',
    shadowOpacity: 0.3,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.2)',
    marginHorizontal: 16,
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#22223b',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  envelopeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: 120,
    height: 90,
    justifyContent: 'flex-start',
  },
  flapWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 3,
    width: 120,
    height: 35,
    backgroundColor: 'transparent',
    backfaceVisibility: 'hidden',
  },
  tipBox: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    padding: 18,
    minWidth: 220,
    shadowColor: '#e63946',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.1)',
  },
  tipText: {
    fontSize: 18,
    color: '#22223b',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});