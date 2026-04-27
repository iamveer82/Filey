/**
 * Chat-scoped error boundary. One bad message should not nuke the screen.
 * Logs to Sentry when wired, renders a compact fallback the user can dismiss.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let sentryCaptureException = null;
try {
  sentryCaptureException = require('@sentry/react-native').captureException;
} catch {}

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    try { sentryCaptureException && sentryCaptureException(error, { extra: info }); } catch {}
    if (__DEV__) console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;
      if (Fallback) return <Fallback error={this.state.error} reset={this.reset} />;
      return (
        <View style={s.wrap}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={s.title}>Something went wrong rendering this.</Text>
          <Text style={s.msg} numberOfLines={3}>{String(this.state.error?.message || this.state.error)}</Text>
          <Pressable onPress={this.reset} style={s.btn}>
            <Text style={s.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  wrap: {
    margin: 10, padding: 14, borderRadius: 14,
    backgroundColor: '#1A1410', borderWidth: 1, borderColor: '#3F2A1A', gap: 6,
  },
  title: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  msg: { color: '#9CA3AF', fontSize: 11.5, lineHeight: 16 },
  btn: {
    alignSelf: 'flex-start', marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  btnText: { color: '#0A0A0A', fontSize: 12, fontWeight: '700' },
});
