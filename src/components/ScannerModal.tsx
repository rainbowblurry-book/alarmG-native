import React, { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] as const;

type Colors = { bg: string; text: string; textDim: string; accent: string; onAccent: string };

/**
 * Full-screen barcode scanner. The caller owns all scan logic (which code is
 * right, locking against double scans); this only shows the camera.
 */
export default function ScannerModal({
  visible,
  onClose,
  title,
  granted,
  onScanned,
  colors,
  fontFamily,
  permissionContent,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  granted: boolean;
  onScanned?: (data: string) => void;
  colors: Colors;
  fontFamily: string;
  /** shown instead of the camera when permission is missing */
  permissionContent: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {!granted ? (
          <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>{permissionContent}</View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={onScanned ? (r) => onScanned(r.data) : undefined}
            />
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <View style={{ margin: 16, padding: 14, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <Text style={{ color: '#EDE7DD', fontFamily, fontSize: 17 }}>{title}</Text>
                <Text style={{ color: '#B9B1A6', fontFamily, fontSize: 13, marginTop: 2 }}>Barcode in the middle</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                <View style={{ width: 240, height: 150, borderWidth: 2, borderColor: 'rgba(237,231,221,0.7)', borderRadius: 16 }} />
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel barcode scanning"
                style={({ pressed }) => ({
                  alignSelf: 'center',
                  marginBottom: 24,
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  paddingHorizontal: 28,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: pressed ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.6)',
                })}
              >
                <Ionicons name="close" size={18} color="#EDE7DD" />
                <Text style={{ color: '#EDE7DD', fontFamily, fontSize: 16 }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
