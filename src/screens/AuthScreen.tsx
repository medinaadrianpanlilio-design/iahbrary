import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { LiquidGlassBackground } from '@/components/ui/LiquidGlassBackground';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/context/AuthContext';

export default function AuthScreen() {
  const { colors, isDark } = useAppleTheme();
  const { signIn, signUp } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (isSignUp) {
      const cleanUsername = signUpUsername.trim();
      const cleanEmail = signUpEmail.trim();

      if (!cleanUsername || !cleanEmail || !password) {
        Alert.alert('Missing Fields', 'Please enter your username, email address, and password.');
        return;
      }

      if (cleanUsername.length < 3) {
        Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
        return;
      }

      if (cleanUsername.length > 24) {
        Alert.alert('Invalid Username', 'Username cannot exceed 24 characters.');
        return;
      }

      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        Alert.alert(
          'Invalid Username',
          'Username can only contain letters, numbers, underscores, hyphens, and periods.'
        );
        return;
      }

      if (password.length < 6) {
        Alert.alert('Weak Password', 'Password should be at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      setLoading(true);
      const { error, needsEmailConfirmation } = await signUp(cleanUsername, cleanEmail, password);
      setLoading(false);

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else if (needsEmailConfirmation) {
        Alert.alert(
          'Verification Email Sent',
          'A confirmation link has been sent to your email. Please verify to log in.',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsSignUp(false);
                setIdentifier(cleanEmail);
              },
            },
          ]
        );
      }
    } else {
      const cleanEmail = identifier.trim();
      if (!cleanEmail || !password) {
        Alert.alert('Missing Fields', 'Please enter your email address and password.');
        return;
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      setLoading(true);
      const { error } = await signIn(cleanEmail, password);
      setLoading(false);

      if (error) {
        Alert.alert('Sign In Failed', error.message);
      }
    }
  };

  const FormDismissWrapper =
    Platform.OS === 'web'
      ? React.Fragment
      : ({ children }: { children: React.ReactNode }) => (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            {children}
          </TouchableWithoutFeedback>
        );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LiquidGlassBackground variant="appleAmbient" />

      <FormDismissWrapper>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS !== 'web'}
          style={styles.keyboardView}
        >
          <View style={styles.inner}>
            {/* Logo & Header */}
            <View style={styles.header}>
              <LiquidGlass
                variant="clear"
                intensity={80}
                cornerRadius={28}
                style={[styles.iconContainer, { backgroundColor: colors.secondarySystemFill }]}
              >
                <IconSymbol name="book.fill" size={32} color={colors.tint} />
              </LiquidGlass>
              <Text style={[Typography.largeTitle, { color: colors.label, marginTop: 12 }]}>
                Iahbrary
              </Text>
              <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }]}>
                {isSignUp
                  ? 'Create your personal reading journey'
                  : 'Welcome back to your reading sanctuary'}
              </Text>
            </View>

            {/* Liquid Glass Form Card */}
            <LiquidGlass
              variant="regular"
              intensity={90}
              cornerRadius={CornerRadius.xxl}
              style={[styles.formCard, Shadows.card]}
            >
              <Text style={[Typography.title2, { color: colors.label, marginBottom: 18, textAlign: 'center' }]}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>

              {isSignUp ? (
                <>
                  {/* Username Input (Sign Up) */}
                  <View style={[styles.inputContainer, { backgroundColor: colors.tertiarySystemFill, borderColor: colors.separator }]}>
                    <IconSymbol name="person" size={18} color={colors.secondaryLabel} />
                    <TextInput
                      style={[styles.input, { color: colors.label }]}
                      placeholder="Username"
                      placeholderTextColor={colors.tertiaryLabel}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={signUpUsername}
                      onChangeText={setSignUpUsername}
                    />
                  </View>

                  {/* Email Input (Sign Up) */}
                  <View style={[styles.inputContainer, { backgroundColor: colors.tertiarySystemFill, borderColor: colors.separator }]}>
                    <IconSymbol name="envelope" size={18} color={colors.secondaryLabel} />
                    <TextInput
                      style={[styles.input, { color: colors.label }]}
                      placeholder="Email address"
                      placeholderTextColor={colors.tertiaryLabel}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={signUpEmail}
                      onChangeText={setSignUpEmail}
                    />
                  </View>
                </>
              ) : (
                <>
                  {/* Email Input (Sign In) */}
                  <View style={[styles.inputContainer, { backgroundColor: colors.tertiarySystemFill, borderColor: colors.separator }]}>
                    <IconSymbol name="envelope" size={18} color={colors.secondaryLabel} />
                    <TextInput
                      style={[styles.input, { color: colors.label }]}
                      placeholder="Email address"
                      placeholderTextColor={colors.tertiaryLabel}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={identifier}
                      onChangeText={setIdentifier}
                    />
                  </View>
                  <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: -4, marginBottom: 12 }]}>
                    Use the email you signed up with. Usernames are display names only.
                  </Text>
                </>
              )}

              {/* Password Input */}
              <View style={[styles.inputContainer, { backgroundColor: colors.tertiarySystemFill, borderColor: colors.separator }]}>
                <IconSymbol name="lock" size={18} color={colors.secondaryLabel} />
                <TextInput
                  style={[styles.input, { color: colors.label }]}
                  placeholder="Password"
                  placeholderTextColor={colors.tertiaryLabel}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol
                    name={showPassword ? 'eye.slash' : 'eye'}
                    size={18}
                    color={colors.tertiaryLabel}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <View style={[styles.inputContainer, { backgroundColor: colors.tertiarySystemFill, borderColor: colors.separator }]}>
                  <IconSymbol name="lock" size={18} color={colors.secondaryLabel} />
                  <TextInput
                    style={[styles.input, { color: colors.label }]}
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.tertiaryLabel}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.submitButton, { backgroundColor: colors.tint }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Toggle Mode */}
              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setIsSignUp(!isSignUp);
                }}
                style={styles.toggleButton}
              >
                <Text style={[Typography.footnote, { color: colors.secondaryLabel }]}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  <Text style={{ color: colors.tint, fontWeight: '700' }}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </LiquidGlass>
          </View>
        </KeyboardAvoidingView>
      </FormDismissWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    padding: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  submitButton: {
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
});
