/**
 * templateEditor.tsx
 * GoodNotes-style drawing editor
 * - 5 pen types: Ballpen, Marker, Fountain, Brush, Pencil
 * - Full HSV color wheel (pure JS, no native deps)
 * - Size slider + Opacity slider
 * - Eraser + Text tool
 * - Undo / Clear
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    PanResponder,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { STANDARD_TEMPLATES } from './templateSelection';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_W = SCREEN_W - 32;
const CANVAS_H = CANVAS_W * 1.4;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Point { x: number; y: number }
interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  penType: string;
}
interface FieldData { [fieldId: string]: string }

// ─── Pen Definitions ──────────────────────────────────────────────────────────
const PEN_TYPES = [
  { id: 'ballpen',   label: 'Ball Pen',  icon: '🖊',  baseWidth: 1,  opacityMult: 1.0,  widthMult: 1.0 },
  { id: 'marker',    label: 'Marker',    icon: '🖍',  baseWidth: 1,  opacityMult: 0.5,  widthMult: 4.0 },
  { id: 'fountain',  label: 'Fountain',  icon: '✒️',  baseWidth: 1,  opacityMult: 0.85, widthMult: 1.5 },
  { id: 'brush',     label: 'Brush',     icon: '🎨',  baseWidth: 1,  opacityMult: 0.6,  widthMult: 3.0 },
  { id: 'pencil',    label: 'Pencil',    icon: '✏️',  baseWidth: 1,  opacityMult: 0.55, widthMult: 0.8 },
];

// ─── HSV → RGB helper ────────────────────────────────────────────────────────
const hsvToHex = (h: number, s: number, v: number): string => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
};

const hexToHsv = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, v];
};

// ─── Preset Colors ────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#ff0000', '#ff4000', '#ff8000', '#ffbf00', '#ffff00', '#80ff00', '#00ff00', '#00ff80',
  '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080', '#ff6699', '#99ccff',
  '#ffcccc', '#ffe5cc', '#ffffcc', '#e5ffcc', '#ccffcc', '#ccffe5', '#ccffff', '#cce5ff',
];

// ─── Color Wheel (pure JS) ────────────────────────────────────────────────────
const COLOR_WHEEL_SIZE = Math.min(SCREEN_W - 80, 260);
const WHEEL_R = COLOR_WHEEL_SIZE / 2;

const ColorWheelPicker = ({
  color, onColorChange, onClose
}: {
  color: string;
  onColorChange: (c: string) => void;
  onClose: () => void;
}) => {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(color));
  const [h, s, v] = hsv;
  const wheelRef = useRef<View>(null);
  const wheelOffsetRef = useRef({ x: 0, y: 0 });
  const svRef = useRef<View>(null);
  const svOffsetRef = useRef({ x: 0, y: 0 });

  const currentColor = hsvToHex(h, s, v);

  // Wheel pan (picks Hue + rough Saturation from ring)
  const wheelPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => handleWheel(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onPanResponderMove: (e) => handleWheel(e.nativeEvent.pageX, e.nativeEvent.pageY),
  })).current;

  const handleWheel = (px: number, py: number) => {
    const cx = px - wheelOffsetRef.current.x - WHEEL_R;
    const cy = py - wheelOffsetRef.current.y - WHEEL_R;
    const dist = Math.sqrt(cx * cx + cy * cy);
    const angle = ((Math.atan2(cy, cx) * 180) / Math.PI + 360) % 360;
    const newS = Math.min(dist / WHEEL_R, 1);
    const newHsv: [number, number, number] = [angle, newS, v];
    setHsv(newHsv);
    onColorChange(hsvToHex(...newHsv));
  };

  // Value (brightness) slider
  const vSliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => handleV(e.nativeEvent.pageX),
    onPanResponderMove: (e) => handleV(e.nativeEvent.pageX),
  })).current;

  const handleV = (px: number) => {
    const sliderW = COLOR_WHEEL_SIZE;
    const relX = px - svOffsetRef.current.x;
    const newV = Math.max(0, Math.min(relX / sliderW, 1));
    const newHsv: [number, number, number] = [h, s, newV];
    setHsv(newHsv);
    onColorChange(hsvToHex(...newHsv));
  };

  // Wheel dot position
  const dotX = WHEEL_R + Math.cos((h * Math.PI) / 180) * s * WHEEL_R;
  const dotY = WHEEL_R + Math.sin((h * Math.PI) / 180) * s * WHEEL_R;
  const vPct = v * 100;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={cpStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={cpStyles.panel}>
              <Text style={cpStyles.title}>Color Picker</Text>

              {/* Wheel */}
              <View
                ref={wheelRef}
                onLayout={() => wheelRef.current?.measureInWindow((x, y) => {
                  wheelOffsetRef.current = { x, y };
                })}
                style={[cpStyles.wheel, { width: COLOR_WHEEL_SIZE, height: COLOR_WHEEL_SIZE }]}
                {...wheelPan.panHandlers}
              >
                {/* Hue ring — rendered as colored segments */}
                {Array.from({ length: 360 }, (_, i) => {
                  const angle = (i * Math.PI) / 180;
                  const x1 = WHEEL_R + Math.cos(angle) * (WHEEL_R - 18);
                  const y1 = WHEEL_R + Math.sin(angle) * (WHEEL_R - 18);
                  return (
                    <View key={i} style={{
                      position: 'absolute',
                      left: x1 - 2, top: y1 - 2,
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: hsvToHex(i, 1, 1),
                    }} />
                  );
                })}
                {/* SV gradient overlay center */}
                <View style={[cpStyles.svCenter, {
                  left: WHEEL_R - WHEEL_R * 0.62,
                  top: WHEEL_R - WHEEL_R * 0.62,
                  width: WHEEL_R * 1.24,
                  height: WHEEL_R * 1.24,
                  borderRadius: WHEEL_R * 0.62,
                  backgroundColor: hsvToHex(h, s, v),
                }]} />
                {/* Dot indicator */}
                <View style={[cpStyles.dot, { left: dotX - 10, top: dotY - 10 }]} />
              </View>

              {/* Brightness slider */}
              <Text style={cpStyles.sliderLabel}>Brightness</Text>
              <View
                ref={svRef}
                onLayout={() => svRef.current?.measureInWindow((x, y) => { svOffsetRef.current = { x, y }; })}
                style={[cpStyles.slider, { width: COLOR_WHEEL_SIZE }]}
                {...vSliderPan.panHandlers}
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <View key={i} style={{
                    flex: 1, backgroundColor: hsvToHex(h, s, i / 19),
                  }} />
                ))}
                <View style={[cpStyles.sliderThumb, { left: `${vPct}%` as any }]} />
              </View>

              {/* Presets */}
              <View style={cpStyles.presets}>
                {PRESET_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { const newHsv = hexToHsv(c); setHsv(newHsv); onColorChange(c); }}
                    style={[cpStyles.preset, { backgroundColor: c },
                      currentColor.toLowerCase() === c.toLowerCase() && cpStyles.presetActive]}
                  />
                ))}
              </View>

              {/* Preview + Done */}
              <View style={cpStyles.previewRow}>
                <View style={[cpStyles.previewSwatch, { backgroundColor: currentColor }]} />
                <Text style={cpStyles.previewHex}>{currentColor.toUpperCase()}</Text>
                <TouchableOpacity onPress={onClose} style={cpStyles.doneBtn}>
                  <Text style={cpStyles.doneTxt}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Stroke Renderer ─────────────────────────────────────────────────────────
const StrokeView = React.memo(({ stroke }: { stroke: Stroke }) => {
  if (!stroke.points.length) return null;

  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const r = stroke.width / 2;
    return (
      <View style={{
        position: 'absolute', left: p.x - r, top: p.y - r,
        width: stroke.width, height: stroke.width,
        borderRadius: r, backgroundColor: stroke.color, opacity: stroke.opacity,
      }} />
    );
  }

  return (
    <>
      {stroke.points.slice(0, -1).map((p1, i) => {
        const p2 = stroke.points[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.5) return null;

        // Fountain pen: taper at ends
        let w = stroke.width;
        if (stroke.penType === 'fountain') {
          const t = i / stroke.points.length;
          w = stroke.width * (0.3 + 0.7 * Math.sin(Math.PI * t));
        }
        // Brush: vary with speed
        if (stroke.penType === 'brush') {
          w = Math.max(stroke.width * 0.4, stroke.width - len * 0.1);
        }

        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        return (
          <View key={i} style={{
            position: 'absolute',
            left: midX - len / 2, top: midY - w / 2,
            width: len + 1, height: Math.max(1, w),
            borderRadius: w / 2,
            backgroundColor: stroke.color,
            opacity: stroke.opacity,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        );
      })}
    </>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TemplateEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const templateId   = params.templateId as string;
  const selectedDate = (params.selectedDate as string) || '';
  const template = STANDARD_TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;

  type Tool = 'draw' | 'text' | 'eraser';
  const [activeTool,    setActiveTool]    = useState<Tool>('draw');
  const [activePenId,   setActivePenId]   = useState('ballpen');
  const [activeColor,   setActiveColor]   = useState('#1a1a1a');
  const [strokeSize,    setStrokeSize]    = useState(4);
  const [strokeOpacity, setStrokeOpacity] = useState(1.0);
  const [strokes,       setStrokes]       = useState<Stroke[]>([]);
  const [liveStroke,    setLiveStroke]    = useState<Stroke | null>(null);
  const [fieldData,     setFieldData]     = useState<FieldData>({});
  const [activeField,   setActiveField]   = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);

  // Refs for stale-closure-free access in PanResponder
  const currentStrokeRef  = useRef<Stroke | null>(null);
  const canvasOffsetRef   = useRef({ x: 0, y: 0 });
  const canvasRef         = useRef<View>(null);
  const activeToolRef     = useRef<Tool>('draw');
  const activePenIdRef    = useRef('ballpen');
  const activeColorRef    = useRef('#1a1a1a');
  const strokeSizeRef     = useRef(4);
  const strokeOpacityRef  = useRef(1.0);
  const templateBgRef     = useRef(template.bg);

  activeToolRef.current    = activeTool;
  activePenIdRef.current   = activePenId;
  activeColorRef.current   = activeColor;
  strokeSizeRef.current    = strokeSize;
  strokeOpacityRef.current = strokeOpacity;
  templateBgRef.current    = template.bg;

  const isDrawMode = activeTool !== 'text';
  const TITLE_H      = CANVAS_H * 0.10;
  const FIELD_AREA_H = CANVAS_H * 0.86;

  const getFieldRect = (field: any) => ({
    left: field.x * CANVAS_W + 5, top: TITLE_H + field.y * FIELD_AREA_H + 5,
    width: field.w * CANVAS_W - 10, height: field.h * FIELD_AREA_H - 10,
  });

  const measureCanvas = () => {
    canvasRef.current?.measureInWindow((x, y) => { canvasOffsetRef.current = { x, y }; });
  };

  const getDrawParams = () => {
    const tool = activeToolRef.current;
    if (tool === 'eraser') return { color: templateBgRef.current, width: 28, opacity: 1, penType: 'eraser' };
    const pen = PEN_TYPES.find(p => p.id === activePenIdRef.current) || PEN_TYPES[0];
    return {
      color:   activeColorRef.current,
      width:   strokeSizeRef.current * pen.widthMult,
      opacity: strokeOpacityRef.current * pen.opacityMult,
      penType: pen.id,
    };
  };

  // ─── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder:         () => true,
    onMoveShouldSetPanResponderCapture:  () => true,

    onPanResponderGrant: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const x = pageX - canvasOffsetRef.current.x;
      const y = pageY - canvasOffsetRef.current.y;
      const p = getDrawParams();
      const s: Stroke = { id: Date.now().toString(), points: [{ x, y }], ...p };
      currentStrokeRef.current = s;
      setLiveStroke({ ...s });
    },

    onPanResponderMove: (evt) => {
      if (!currentStrokeRef.current) return;
      const { pageX, pageY } = evt.nativeEvent;
      currentStrokeRef.current.points.push({
        x: pageX - canvasOffsetRef.current.x,
        y: pageY - canvasOffsetRef.current.y,
      });
      if (currentStrokeRef.current.points.length % 2 === 0) {
        setLiveStroke({ ...currentStrokeRef.current, points: [...currentStrokeRef.current.points] });
      }
    },

    onPanResponderRelease: () => {
      if (!currentStrokeRef.current) return;
      setStrokes(p => [...p, { ...currentStrokeRef.current!, points: [...currentStrokeRef.current!.points] }]);
      setLiveStroke(null);
      currentStrokeRef.current = null;
    },

    onPanResponderTerminate: () => {
      if (!currentStrokeRef.current) return;
      setStrokes(p => [...p, { ...currentStrokeRef.current!, points: [...currentStrokeRef.current!.points] }]);
      setLiveStroke(null);
      currentStrokeRef.current = null;
    },
  })).current;

  const handleUndo  = useCallback(() => setStrokes(p => p.slice(0, -1)), []);
  const handleClear = useCallback(() => {
    Alert.alert('Clear all drawings?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setStrokes([]) },
    ]);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        id: `template_entry_${selectedDate}_${templateId}_${Date.now()}`,
        templateId, templateName: template.name,
        selectedDate, savedAt: new Date().toISOString(),
        strokes, fields: fieldData,
      };
      const existing = await AsyncStorage.getItem('saved_template_entries');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(data);
      await AsyncStorage.setItem('saved_template_entries', JSON.stringify(list));
      Alert.alert('Saved! ✅', '', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Error', 'Could not save.');
    } finally { setIsSaving(false); }
  };

  const activePen = PEN_TYPES.find(p => p.id === activePenId) || PEN_TYPES[0];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: '#e0e0e0' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.topTitle, { color: colors.textPrimary }]}>{template.name}</Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>{selectedDate}</Text>
        </View>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnTxt}>{isSaving ? '...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Canvas ── */}
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', paddingVertical: 12, paddingBottom: 220 }}
        scrollEnabled={!isDrawMode}
        keyboardShouldPersistTaps="handled"
        onScroll={measureCanvas}
        scrollEventThrottle={16}
      >
        <View ref={canvasRef} onLayout={measureCanvas}
          style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H, backgroundColor: template.bg }]}
          {...(isDrawMode ? panResponder.panHandlers : {})}
        >
          <View style={[styles.titleArea, { height: TITLE_H }]}>
            <Text style={[styles.titleText, { color: template.accent }]}>{template.titleText}</Text>
          </View>

          {template.fields.map((field) => {
            const rect = getFieldRect(field);
            const isActive = activeField === field.id;
            return (
              <View key={field.id} style={[styles.fieldBox, {
                left: rect.left, top: rect.top, width: rect.width, height: rect.height,
                borderColor: isActive ? template.accent : template.accent + '55',
                borderWidth: isActive ? 1.5 : 1,
              }]}>
                <Text style={[styles.fieldLabel, { color: template.accent }]}>{field.label}</Text>
                {activeTool === 'text' ? (
                  <TextInput
                    style={[styles.fieldInput, { color: activeColor }]}
                    multiline value={fieldData[field.id] || ''}
                    onChangeText={val => setFieldData(p => ({ ...p, [field.id]: val }))}
                    onFocus={() => setActiveField(field.id)}
                    onBlur={() => setActiveField(null)}
                    placeholder={`${field.label}...`}
                    placeholderTextColor={template.accent + '55'}
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={[styles.fieldStaticTxt, { color: activeColor }]}>{fieldData[field.id] || ''}</Text>
                )}
              </View>
            );
          })}

          {strokes.map(s => <StrokeView key={s.id} stroke={s} />)}
          {liveStroke && <StrokeView stroke={liveStroke} />}
        </View>
      </ScrollView>

      {/* ══ Bottom Tool Panel (GoodNotes style) ══ */}
      <View style={[styles.bottomPanel, { backgroundColor: colors.background }]}>

        {/* Row 1: Pen type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.penRow}>
          {PEN_TYPES.map(pen => (
            <TouchableOpacity
              key={pen.id}
              onPress={() => { setActiveTool('draw'); setActivePenId(pen.id); }}
              style={[styles.penBtn, activeTool === 'draw' && activePenId === pen.id && {
                backgroundColor: template.accent + '20',
                borderColor: template.accent,
              }]}
            >
              {/* Pen visual */}
              <View style={styles.penIconWrap}>
                <View style={[styles.penBody, { backgroundColor: activeTool === 'draw' && activePenId === pen.id ? activeColor : '#aaa' }]} />
                <View style={[styles.penTip, {
                  borderTopColor: activeTool === 'draw' && activePenId === pen.id ? activeColor : '#aaa',
                  borderTopWidth: pen.id === 'brush' ? 12 : pen.id === 'marker' ? 10 : 8,
                }]} />
                <View style={[styles.penColorBand, { backgroundColor: activeColor }]} />
              </View>
              <Text style={[styles.penLabel, {
                color: activeTool === 'draw' && activePenId === pen.id ? template.accent : '#888',
                fontWeight: activeTool === 'draw' && activePenId === pen.id ? '700' : '400',
              }]}>{pen.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Text tool */}
          <TouchableOpacity
            onPress={() => setActiveTool('text')}
            style={[styles.penBtn, activeTool === 'text' && { backgroundColor: template.accent + '20', borderColor: template.accent }]}
          >
            <View style={[styles.penIconWrap, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 28, color: activeTool === 'text' ? activeColor : '#aaa' }}>T</Text>
            </View>
            <Text style={[styles.penLabel, { color: activeTool === 'text' ? template.accent : '#888' }]}>Text</Text>
          </TouchableOpacity>

          {/* Eraser */}
          <TouchableOpacity
            onPress={() => setActiveTool('eraser')}
            style={[styles.penBtn, activeTool === 'eraser' && { backgroundColor: '#ff000015', borderColor: '#E53935' }]}
          >
            <View style={[styles.penIconWrap, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 26 }}>⬜</Text>
            </View>
            <Text style={[styles.penLabel, { color: activeTool === 'eraser' ? '#E53935' : '#888' }]}>Eraser</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Row 2: Size, Opacity, Color, Undo, Clear */}
        <View style={styles.controlRow}>
          {/* Color swatch → opens full picker */}
          <TouchableOpacity
            onPress={() => setShowColorPicker(true)}
            style={[styles.colorBall, { backgroundColor: activeColor }]}
          >
            <View style={styles.colorBallInner} />
          </TouchableOpacity>

          {/* Size slider */}
          <View style={styles.sliderWrap}>
            <Text style={styles.sliderLbl}>Size  {strokeSize}</Text>
            <SliderBar
              value={strokeSize} min={1} max={40}
              color={activeColor}
              onChange={setStrokeSize}
            />
          </View>

          {/* Opacity slider */}
          <View style={styles.sliderWrap}>
            <Text style={styles.sliderLbl}>Opacity  {Math.round(strokeOpacity * 100)}%</Text>
            <SliderBar
              value={strokeOpacity} min={0.05} max={1}
              color={activeColor}
              onChange={setStrokeOpacity}
            />
          </View>

          {/* Undo */}
          <TouchableOpacity onPress={handleUndo} style={styles.actionBtn}>
            <Text style={{ fontSize: 22 }}>↩️</Text>
          </TouchableOpacity>

          {/* Clear */}
          <TouchableOpacity onPress={handleClear} style={styles.actionBtn}>
            <Text style={{ fontSize: 22 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <ColorWheelPicker
          color={activeColor}
          onColorChange={setActiveColor}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Simple Slider ────────────────────────────────────────────────────────────
const SliderBar = ({ value, min, max, color, onChange }: {
  value: number; min: number; max: number; color: string;
  onChange: (v: number) => void;
}) => {
  const trackRef = useRef<View>(null);
  const offsetRef = useRef({ x: 0, w: 1 });

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => handleMove(e.nativeEvent.pageX),
    onPanResponderMove: (e) => handleMove(e.nativeEvent.pageX),
  })).current;

  const handleMove = (px: number) => {
    const pct = Math.max(0, Math.min((px - offsetRef.current.x) / offsetRef.current.w, 1));
    onChange(min + pct * (max - min));
  };

  const pct = (value - min) / (max - min);

  return (
    <View
      ref={trackRef}
      onLayout={() => trackRef.current?.measureInWindow((x, _y, w) => { offsetRef.current = { x, w }; })}
      style={slStyles.track}
      {...pan.panHandlers}
    >
      <View style={[slStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      <View style={[slStyles.thumb, { left: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBtn: { padding: 4 },
  topTitle: { fontSize: 16, fontWeight: '700' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 22 },
  saveBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  canvas: {
    borderRadius: 16, overflow: 'hidden',
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10,
  },
  titleArea: { justifyContent: 'center', alignItems: 'center' },
  titleText: { fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 3, lineHeight: 24 },
  fieldBox: {
    position: 'absolute', borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.65)', padding: 8, overflow: 'hidden',
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
  fieldInput: { flex: 1, fontSize: 13, lineHeight: 19, padding: 0 },
  fieldStaticTxt: { fontSize: 13, lineHeight: 19, flex: 1 },

  // Bottom panel
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 20, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
  },
  penRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  penBtn: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', minWidth: 62,
  },
  penIconWrap: { width: 32, height: 46, alignItems: 'center', justifyContent: 'flex-end' },
  penBody: { width: 10, height: 28, borderRadius: 3 },
  penTip: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderLeftColor: 'transparent',
    borderRightWidth: 5, borderRightColor: 'transparent',
  },
  penColorBand: { width: 10, height: 4, borderRadius: 2, marginTop: 2 },
  penLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },

  controlRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8,
  },
  colorBall: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 3, borderColor: '#fff',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  colorBallInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  sliderWrap: { flex: 1 },
  sliderLbl: { fontSize: 9, color: '#888', marginBottom: 3 },
  actionBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
});

const slStyles = StyleSheet.create({
  track: {
    height: 6, borderRadius: 3, backgroundColor: '#ddd',
    justifyContent: 'center', position: 'relative',
  },
  fill: { position: 'absolute', left: 0, top: 0, height: 6, borderRadius: 3 },
  thumb: {
    position: 'absolute', width: 16, height: 16, borderRadius: 8,
    marginLeft: -8, top: -5,
    borderWidth: 2, borderColor: '#fff',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3,
  },
});

const cpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  panel: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 20, alignItems: 'center',
    width: COLOR_WHEEL_SIZE + 48,
    elevation: 20,
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 14, color: '#222' },
  wheel: {
    borderRadius: COLOR_WHEEL_SIZE / 2,
    backgroundColor: '#f0f0f0',
    marginBottom: 14, position: 'relative', overflow: 'hidden',
  },
  svCenter: { position: 'absolute', opacity: 0.5 },
  dot: {
    position: 'absolute', width: 20, height: 20, borderRadius: 10,
    borderWidth: 3, borderColor: '#fff',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
  },
  sliderLabel: { alignSelf: 'flex-start', fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
  slider: {
    height: 22, borderRadius: 11, flexDirection: 'row',
    overflow: 'hidden', marginBottom: 14, position: 'relative',
  },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    marginLeft: -11, borderWidth: 3, borderColor: '#fff',
    elevation: 4, backgroundColor: '#888',
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 14, justifyContent: 'center' },
  preset: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#ddd' },
  presetActive: { borderWidth: 3, borderColor: '#333' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  previewSwatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#ddd' },
  previewHex: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  doneBtn: { backgroundColor: '#1E88E5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  doneTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});