import React, { Component, ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Shows the error text with a Copy button instead of a blank crash, so it can be
 * pasted into chat. It can't silence anything: a ringing alarm keeps ringing in the
 * native service, and "Try again" re-renders the app (and the ringing screen).
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; stack: string; copied: boolean }> {
  state = { error: null as Error | null, stack: '', copied: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ stack: info.componentStack ?? '' });
    console.error('ClockGuard UI error', error);
  }

  render() {
    const { error, stack, copied } = this.state;
    if (!error) return this.props.children;
    const text = `ClockGuard error\n${error.name}: ${error.message}\n${error.stack ?? ''}\n${stack}`.slice(0, 6000);
    const btn = (label: string, onPress: () => void) => (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#3A322B' : '#2A241F' })}
      >
        <Text style={{ color: '#E8DFD3', fontSize: 16, fontWeight: '600' }}>{label}</Text>
      </Pressable>
    );
    return (
      <View style={{ flex: 1, backgroundColor: '#14110F', padding: 20, paddingTop: 56, gap: 14 }}>
        <Text style={{ color: '#E8DFD3', fontSize: 22, fontWeight: '700' }}>Something broke in the screen</Text>
        <Text style={{ color: '#A2978A', fontSize: 14 }}>
          A ringing alarm keeps ringing. Copy this and paste it into the chat, then tap Try again.
        </Text>
        <ScrollView style={{ flex: 1, backgroundColor: '#1D1916', borderRadius: 12 }} contentContainerStyle={{ padding: 12 }}>
          <Text selectable style={{ color: '#CFC4B6', fontSize: 12, fontFamily: 'monospace' }}>
            {text}
          </Text>
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {btn(copied ? 'Copied' : 'Copy', () => {
            Clipboard.setStringAsync(text)
              .then(() => this.setState({ copied: true }))
              .catch(() => {});
          })}
          {btn('Try again', () => this.setState({ error: null, stack: '', copied: false }))}
        </View>
      </View>
    );
  }
}
