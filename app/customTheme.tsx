import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Dimensions,
    Modal,
    PanResponder,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { CustomColors, PRESET_THEMES, useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PICKER_WIDTH = SCREEN_WIDTH - 48;
const PICKER_HEIGHT = 200;
const SLIDER_WIDTH = SCREEN_WIDTH - 48;
const SLIDER_HEIGHT = 28;

// ---- Color fields ----
const COLOR_FIELDS: { key: keyof CustomColors; label: string; emoji: string }[] = [
    { key: 'background', label: 'Background', emoji: '🎨' },
    { key: 'cardBackground', label: 'Card Background', emoji: '🃏' },
    { key: 'textPrimary', label: 'Primary Text', emoji: '🔤' },
    { key: 'textSecondary', label: 'Secondary Text', emoji: '📝' },
    { key: 'textTertiary', label: 'Tertiary Text', emoji: '🔡' },
    { key: 'primary', label: 'Primary (Accent)', emoji: '⭐' },
    { key: 'primaryLight', label: 'Primary Light', emoji: '✨' },
    { key: 'border', label: 'Border', emoji: '▭' },
    { key: 'diary', label: 'Diary Color', emoji: '📔' },
];

// ---- Helpers ----
const hsvToRgb = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const rgbToHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();

const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
    ];
};

const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, v];
};

const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{6})$/.test(hex);

const getContrastText = (hex: string): string => {
    try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#FFFFFF';
    } catch { return '#000000'; }
};

const hueToHex = (h: number) => {
    const [r, g, b] = hsvToRgb(h, 1, 1);
    return rgbToHex(r, g, b);
};

// ---- Hue Slider ----
const HueSlider = ({ hue, onChange }: { hue: number; onChange: (h: number) => void }) => {
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                const x = e.nativeEvent.locationX;
                onChange(Math.max(0, Math.min(1, x / SLIDER_WIDTH)));
            },
            onPanResponderMove: (e) => {
                const x = e.nativeEvent.locationX;
                onChange(Math.max(0, Math.min(1, x / SLIDER_WIDTH)));
            },
        })
    ).current;

    const hueColors = ['#FF0000', '#FF8000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'];

    return (
        <View style={{ marginVertical: 10 }}>
            <Text style={styles2.sliderLabel}>Hue</Text>
            <View
                {...panResponder.panHandlers}
                style={[styles2.sliderTrack, {
                    background: `linear-gradient(to right, ${hueColors.join(', ')})` as any,
                    flexDirection: 'row',
                    overflow: 'hidden',
                }]}
            >
                {/* Gradient segments */}
                {hueColors.slice(0, -1).map((color, i) => (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            height: SLIDER_HEIGHT,
                            backgroundColor: color,
                        }}
                    />
                ))}
                {/* Thumb */}
                <View style={[styles2.sliderThumb, { left: hue * SLIDER_WIDTH - 12, position: 'absolute' }]}
                />
            </View>
        </View>
    );
};

// ---- Saturation/Value Box ----
const SatValBox = ({
    hue, sat, val,
    onChange
}: {
    hue: number; sat: number; val: number;
    onChange: (s: number, v: number) => void;
}) => {
    const hueHex = hueToHex(hue);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                const x = Math.max(0, Math.min(1, e.nativeEvent.locationX / PICKER_WIDTH));
                const y = Math.max(0, Math.min(1, e.nativeEvent.locationY / PICKER_HEIGHT));
                onChange(x, 1 - y);
            },
            onPanResponderMove: (e) => {
                const x = Math.max(0, Math.min(1, e.nativeEvent.locationX / PICKER_WIDTH));
                const y = Math.max(0, Math.min(1, e.nativeEvent.locationY / PICKER_HEIGHT));
                onChange(x, 1 - y);
            },
        })
    ).current;

    const dotX = sat * PICKER_WIDTH;
    const dotY = (1 - val) * PICKER_HEIGHT;

    return (
        <View
            {...panResponder.panHandlers}
            style={[styles2.satValBox, { width: PICKER_WIDTH, height: PICKER_HEIGHT }]}
        >
            {/* White to HueColor gradient (horizontal) */}
            {Array.from({ length: 20 }).map((_, col) => (
                Array.from({ length: 20 }).map((_, row) => {
                    const s = col / 19;
                    const v = 1 - row / 19;
                    const [r, g, b] = hsvToRgb(hue, s, v);
                    return (
                        <View
                            key={`${col}-${row}`}
                            style={{
                                position: 'absolute',
                                left: (col / 20) * PICKER_WIDTH,
                                top: (row / 20) * PICKER_HEIGHT,
                                width: PICKER_WIDTH / 20 + 1,
                                height: PICKER_HEIGHT / 20 + 1,
                                backgroundColor: rgbToHex(r, g, b),
                            }}
                        />
                    );
                })
            ))}
            {/* Dot */}
            <View style={[styles2.satValDot, { left: dotX - 10, top: dotY - 10 }]} />
        </View>
    );
};

export default function CustomThemeScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { colors, customColors, setCustomColors, setTheme, activePresetId, setPresetTheme } = useTheme();

    const [draft, setDraft] = useState<CustomColors>({
        primary: '#FF5252',
        primaryLight: '#FF8A80',
        background: '#FFFFFF',
        cardBackground: '#F5F5F5',
        textPrimary: '#333333',
        textSecondary: '#666666',
        textTertiary: '#999999',
        border: '#E1E1E1',
        success: '#4CAF50',
        warning: '#FFF9C4',
        diary: '#9C27B0',
        white: '#FFFFFF',
        grey: '#b6b6b62b',
    });

    const [pickerVisible, setPickerVisible] = useState(false);
    const [activeField, setActiveField] = useState<keyof CustomColors | null>(null);
    const [hue, setHue] = useState(0);
    const [sat, setSat] = useState(0.9);
    const [val, setVal] = useState(0.9);
    const [hexInput, setHexInput] = useState('#FF5252');
    const [hexError, setHexError] = useState(false);

    useEffect(() => {
        if (customColors) setDraft(customColors);
    }, []);

    const currentHex = useCallback(() => {
        const [r, g, b] = hsvToRgb(hue, sat, val);
        return rgbToHex(r, g, b);
    }, [hue, sat, val]);

    const openPicker = (field: keyof CustomColors) => {
        setActiveField(field);
        const hex = draft[field];
        if (isValidHex(hex)) {
            const [r, g, b] = hexToRgb(hex);
            const [h, s, v] = rgbToHsv(r, g, b);
            setHue(h); setSat(s); setVal(v);
            setHexInput(hex);
        }
        setHexError(false);
        setPickerVisible(true);
    };

    const onHueChange = (h: number) => {
        setHue(h);
        const [r, g, b] = hsvToRgb(h, sat, val);
        setHexInput(rgbToHex(r, g, b));
    };

    const onSatValChange = (s: number, v: number) => {
        setSat(s); setVal(v);
        const [r, g, b] = hsvToRgb(hue, s, v);
        setHexInput(rgbToHex(r, g, b));
    };

    const onHexInputChange = (text: string) => {
        const formatted = '#' + text.replace('#', '').toUpperCase();
        setHexInput(formatted);
        setHexError(false);
        if (isValidHex(formatted)) {
            const [r, g, b] = hexToRgb(formatted);
            const [h, s, v] = rgbToHsv(r, g, b);
            setHue(h); setSat(s); setVal(v);
        }
    };

    const confirmColor = () => {
        if (!activeField) return;
        const hex = currentHex();
        setDraft(prev => ({ ...prev, [activeField]: hex }));
        setPickerVisible(false);
    };

    const handleSave = async () => {
        await setCustomColors(draft);
        await setTheme('custom');
        Alert.alert('✅', t('custom_theme_applied') || 'Custom theme applied!');
        router.back();
    };

    const handleReset = () => {
        Alert.alert(
            t('reset_theme') || 'Reset Theme',
            t('reset_theme_confirm') || 'Reset to default light colors?',
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('reset') || 'Reset',
                    onPress: () => setDraft({
                        primary: '#FF5252', primaryLight: '#FF8A80',
                        background: '#FFFFFF', cardBackground: '#F5F5F5',
                        textPrimary: '#333333', textSecondary: '#666666',
                        textTertiary: '#999999', border: '#E1E1E1',
                        success: '#4CAF50', warning: '#FFF9C4',
                        diary: '#9C27B0', white: '#FFFFFF', grey: '#b6b6b62b',
                    }),
                },
            ]
        );
    };

    const activeLabel = activeField
        ? COLOR_FIELDS.find(f => f.key === activeField)?.label ?? activeField
        : '';

    const liveHex = currentHex();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

            {/* HEADER */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.cardBackground }]}>
                        <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {t('custom_theme') || 'Custom Theme'}
                </Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={[styles.resetText, { color: colors.textSecondary }]}>
                        {t('reset') || 'Reset'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* PREVIEW CARD */}
                {/* <View style={[styles.previewCard, { backgroundColor: draft.cardBackground, borderColor: draft.border }]}>
                    <Text style={[styles.previewTitle, { color: draft.textPrimary }]}>Preview 👁️</Text>
                    <Text style={[styles.previewSub, { color: draft.textSecondary }]}>Secondary text looks like this</Text>
                    <Text style={[styles.previewTertiary, { color: draft.textTertiary }]}>Tertiary text looks like this</Text>
                    <View style={styles.previewRow}>
                        {(['primary', 'primaryLight', 'diary'] as const).map(key => (
                            <View key={key} style={[styles.previewAccent, { backgroundColor: draft[key] }]}>
                                <Text style={{ color: getContrastText(draft[key]), fontWeight: '700', fontSize: 13 }}>
                                    {key === 'primary' ? 'Primary' : key === 'primaryLight' ? 'Accent' : 'Diary'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View> */}

                {/* ✅ PRESET THEMES */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 8 }]}>
                    Quick Themes
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 10, paddingRight: 16 }}>
                        {PRESET_THEMES.map(preset => {
                            const isActive = activePresetId === preset.id;
                            return (
                                <TouchableOpacity
                                    key={preset.id}
                                    onPress={() => {
                                        setPresetTheme(preset);
                                        Alert.alert(preset.emoji, `${preset.name} theme applied!`);
                                    }}
                                    activeOpacity={0.8}
                                    style={[
                                        presetStyles.card,
                                        { borderColor: isActive ? preset.light.primary : colors.border },
                                        isActive && { borderWidth: 2.5 },
                                    ]}
                                >
                                    {/* Color dots */}
                                    <View style={presetStyles.dotsRow}>
                                        <View style={[presetStyles.dot, { backgroundColor: preset.light.primary }]} />
                                        <View style={[presetStyles.dot, { backgroundColor: preset.light.primaryLight }]} />
                                        <View style={[presetStyles.dot, { backgroundColor: preset.light.diary }]} />
                                    </View>
                                    <Text style={presetStyles.emoji}>{preset.emoji}</Text>
                                    <Text style={[presetStyles.name, { color: colors.textPrimary }]}>
                                        {preset.name}
                                    </Text>
                                    {isActive && (
                                        <View style={[presetStyles.activeBadge, { backgroundColor: preset.light.primary }]}>
                                            <Text style={presetStyles.activeBadgeText}>✓ Active</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* {COLOR_FIELDS.map(field => (
                    <TouchableOpacity
                        key={field.key}
                        style={[styles.colorRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                        onPress={() => openPicker(field.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.fieldEmoji}>{field.emoji}</Text>
                        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{field.label}</Text>
                        <View style={styles.colorRight}>
                            <Text style={[styles.hexText, { color: colors.textTertiary }]}>{draft[field.key]}</Text>
                            <View style={[styles.colorCircle, { backgroundColor: draft[field.key], borderColor: colors.border }]} />
                        </View>
                    </TouchableOpacity>
                ))} */}

                {/* <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: draft.primary }]}
                    onPress={handleSave}
                >
                    <Text style={[styles.saveBtnText, { color: getContrastText(draft.primary) }]}>
                        {t('apply_custom_theme') || 'Apply Custom Theme'}
                    </Text>
                </TouchableOpacity> */}

            </ScrollView>

            <Modal
                visible={pickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.pickerModal, { backgroundColor: colors.background }]}>

                        {/* Title + Preview */}
                        <View style={styles2.titleRow}>
                            <View style={[styles2.previewCircle, { backgroundColor: liveHex }]} />
                            <Text style={[styles.pickerTitle, { color: colors.textPrimary, flex: 1 }]}>
                                {activeLabel}
                            </Text>
                            <Text style={[styles2.liveHexBadge, { color: colors.textSecondary }]}>
                                {liveHex}
                            </Text>
                        </View>

                        {/* Sat/Val Box */}
                        <SatValBox
                            hue={hue} sat={sat} val={val}
                            onChange={onSatValChange}
                        />

                        {/* Hue Slider */}
                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles2.sliderLabel, { color: colors.textSecondary }]}>Hue</Text>
                            <View style={{ position: 'relative', height: SLIDER_HEIGHT }}>
                                <View style={styles2.hueGradient}>
                                    {Array.from({ length: 36 }).map((_, i) => (
                                        <View
                                            key={i}
                                            style={{
                                                flex: 1,
                                                height: SLIDER_HEIGHT,
                                                backgroundColor: hueToHex(i / 36),
                                            }}
                                        />
                                    ))}
                                </View>
                                {/* Hue PanResponder wrapper */}
                                <HuePanView hue={hue} onChange={onHueChange} />
                            </View>
                        </View>

                        {/* Hex Input */}
                        <View style={[styles.hexInputRow, {
                            backgroundColor: colors.cardBackground,
                            borderColor: hexError ? '#FF5252' : colors.border,
                            marginTop: 14,
                        }]}>
                            <Text style={[styles.hashText, { color: colors.textSecondary }]}>#</Text>
                            <TextInput
                                style={[styles.hexInput, { color: colors.textPrimary }]}
                                value={hexInput.replace('#', '')}
                                onChangeText={onHexInputChange}
                                placeholder="FF5252"
                                placeholderTextColor={colors.textTertiary}
                                maxLength={6}
                                autoCapitalize="characters"
                            />
                            <View style={[styles2.hexPreviewBox, { backgroundColor: isValidHex(hexInput) ? hexInput : '#ccc' }]} />
                        </View>
                        {hexError && <Text style={styles.hexErrorText}>Invalid hex (e.g. FF5252)</Text>}

                        {/* Actions */}
                        <View style={styles.pickerActions}>
                            <TouchableOpacity
                                style={[styles.pickerBtn, { backgroundColor: colors.cardBackground }]}
                                onPress={() => setPickerVisible(false)}
                            >
                                <Text style={[styles.pickerBtnText, { color: colors.textSecondary }]}>
                                    {t('cancel') || 'Cancel'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pickerBtn, { backgroundColor: liveHex }]}
                                onPress={confirmColor}
                            >
                                <Text style={[styles.pickerBtnText, { color: getContrastText(liveHex) }]}>
                                    {t('ok') || 'OK'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

function HuePanView({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
                onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / SLIDER_WIDTH)));
            },
            onPanResponderMove: (e) => {
                onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / SLIDER_WIDTH)));
            },
        })
    ).current;

    return (
        <View
            {...panResponder.panHandlers}
            style={[StyleSheet.absoluteFillObject]}
        >
            <View style={[styles2.sliderThumb, {
                position: 'absolute',
                left: hue * SLIDER_WIDTH - 12,
                top: SLIDER_HEIGHT / 2 - 12,
            }]} />
        </View>
    );
}

const presetStyles = StyleSheet.create({
    card: {
        width: 110,
        backgroundColor: '#F9F9F9',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.5,
    },
    dotsRow: { flexDirection: 'row', gap: 5, marginBottom: 4 },
    dot: { width: 18, height: 18, borderRadius: 9 },
    emoji: { fontSize: 24 },
    name: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    activeBadge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 20, marginTop: 2,
    },
    activeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
const styles2 = StyleSheet.create({
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    previewCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E0E0E0' },
    liveHexBadge: { fontSize: 13, fontWeight: '500' },
    sliderLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    sliderTrack: {
        height: SLIDER_HEIGHT,
        borderRadius: SLIDER_HEIGHT / 2,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    sliderThumb: {
        width: 24, height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 2.5,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    satValBox: {
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    satValDot: {
        position: 'absolute',
        width: 20, height: 20,
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 5,
    },
    hueGradient: {
        flexDirection: 'row',
        height: SLIDER_HEIGHT,
        borderRadius: SLIDER_HEIGHT / 2,
        overflow: 'hidden',
        position: 'absolute',
        width: '100%',
    },
    hexPreviewBox: {
        width: 28, height: 28, borderRadius: 6,
        borderWidth: 1, borderColor: '#E0E0E0',
    },
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, paddingTop: 16,
    },
    backBtn: {},
    iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    resetText: { fontSize: 15, fontWeight: '500' },
    scroll: { padding: 16, paddingBottom: 50, gap: 10 },
    previewCard: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 6, marginBottom: 6 },
    previewTitle: { fontSize: 18, fontWeight: '700' },
    previewSub: { fontSize: 14 },
    previewTertiary: { fontSize: 12 },
    previewRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    previewAccent: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '500', marginTop: 4, marginBottom: 4 },
    colorRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
    fieldEmoji: { fontSize: 20, width: 28 },
    fieldLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
    colorRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    hexText: { fontSize: 12 },
    colorCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
    saveBtn: { marginTop: 10, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    saveBtnText: { fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    pickerModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
    pickerTitle: { fontSize: 17, fontWeight: '700' },
    hexInputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, gap: 6,
    },
    hashText: { fontSize: 18, fontWeight: '700' },
    hexInput: { flex: 1, fontSize: 18, fontWeight: '600', letterSpacing: 2 },
    hexErrorText: { color: '#FF5252', fontSize: 12 },
    pickerActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    pickerBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    pickerBtnText: { fontSize: 16, fontWeight: '600' },
});