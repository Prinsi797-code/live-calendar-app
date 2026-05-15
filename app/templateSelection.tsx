import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions, SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

// ─── Template Definitions ───────────────────────────────────────────────────
const STANDARD_TEMPLATES = [
  {
    id: 'self_care_daily',
    category: 'Self Care',
    name: 'Self Care Checklist',
    emoji: '💖',
    bg: '#FFE4EE',
    accent: '#FF85A2',
    fields: [
      { id: 'daily', label: 'Daily', x: 0, y: 0, w: 0.5, h: 0.45 },
      { id: 'weekly', label: 'Weekly', x: 0.5, y: 0, w: 0.5, h: 0.45 },
      { id: 'monthly', label: 'Monthly', x: 0, y: 0.5, w: 0.5, h: 0.45 },
      { id: 'yearly', label: 'Yearly', x: 0.5, y: 0.5, w: 0.5, h: 0.45 },
    ],
    titleText: 'SELF CARE\nchecklist',
  },
  {
    id: 'todo_simple',
    category: 'To Do List',
    name: 'Simple To Do',
    emoji: '✅',
    bg: '#E8F5E9',
    accent: '#43A047',
    fields: [
      { id: 'today', label: "Today's Tasks", x: 0, y: 0, w: 1, h: 0.6 },
      { id: 'tomorrow', label: 'Tomorrow', x: 0, y: 0.65, w: 1, h: 0.3 },
    ],
    titleText: 'TO DO\nLIST',
  },
  {
    id: 'month_plan',
    category: 'Month Plan',
    name: 'Monthly Planner',
    emoji: '📅',
    bg: '#E3F2FD',
    accent: '#1E88E5',
    fields: [
      { id: 'goals', label: 'Monthly Goals', x: 0, y: 0, w: 1, h: 0.3 },
      { id: 'week1', label: 'Week 1', x: 0, y: 0.35, w: 0.5, h: 0.28 },
      { id: 'week2', label: 'Week 2', x: 0.5, y: 0.35, w: 0.5, h: 0.28 },
      { id: 'week3', label: 'Week 3', x: 0, y: 0.68, w: 0.5, h: 0.28 },
      { id: 'week4', label: 'Week 4', x: 0.5, y: 0.68, w: 0.5, h: 0.28 },
    ],
    titleText: 'MONTHLY\nPLANNER',
  },
  {
    id: 'goals',
    category: 'Goals',
    name: 'Goals Tracker',
    emoji: '🎯',
    bg: '#FFF3E0',
    accent: '#FB8C00',
    fields: [
      { id: 'short', label: 'Short Term Goals', x: 0, y: 0, w: 1, h: 0.3 },
      { id: 'long', label: 'Long Term Goals', x: 0, y: 0.35, w: 1, h: 0.3 },
      { id: 'action', label: 'Action Steps', x: 0, y: 0.7, w: 1, h: 0.25 },
    ],
    titleText: 'GOALS\nTRACKER',
  },
  {
    id: 'habit_tracker',
    category: 'Habits',
    name: 'Habit Tracker',
    emoji: '🌟',
    bg: '#F3E5F5',
    accent: '#8E24AA',
    fields: [
      { id: 'habit1', label: 'Habit 1', x: 0, y: 0, w: 1, h: 0.18 },
      { id: 'habit2', label: 'Habit 2', x: 0, y: 0.21, w: 1, h: 0.18 },
      { id: 'habit3', label: 'Habit 3', x: 0, y: 0.42, w: 1, h: 0.18 },
      { id: 'habit4', label: 'Habit 4', x: 0, y: 0.63, w: 1, h: 0.18 },
      { id: 'notes', label: 'Notes', x: 0, y: 0.84, w: 1, h: 0.12 },
    ],
    titleText: 'HABIT\nTRACKER',
  },
  {
    id: 'journal',
    category: 'Journal',
    name: 'Daily Journal',
    emoji: '📔',
    bg: '#FFF9C4',
    accent: '#F9A825',
    fields: [
      { id: 'mood', label: 'Mood Today', x: 0, y: 0, w: 1, h: 0.15 },
      { id: 'grateful', label: 'Grateful For', x: 0, y: 0.18, w: 1, h: 0.25 },
      { id: 'highlight', label: "Day's Highlight", x: 0, y: 0.46, w: 1, h: 0.25 },
      { id: 'tomorrow', label: 'Tomorrow I Will', x: 0, y: 0.74, w: 1, h: 0.22 },
    ],
    titleText: 'DAILY\nJOURNAL',
  },
];

const CATEGORIES = ['All', 'Self Care', 'To Do List', 'Month Plan', 'Goals', 'Habits', 'Journal'];

// ─── Mini Preview Component ──────────────────────────────────────────────────
const TemplatePreview = ({ template, isSelected }: { template: any; isSelected: boolean }) => {
  const innerW = CARD_WIDTH - 16;
  const innerH = CARD_HEIGHT - 36;

  return (
    <View style={[
      styles.previewCard,
      {
        borderColor: isSelected ? template.accent : 'transparent',
        borderWidth: isSelected ? 2.5 : 0,
      }
    ]}>
      {/* Mini template render */}
      <View style={[styles.previewInner, { backgroundColor: template.bg, width: innerW, height: innerH }]}>
        {/* Title */}
        <Text style={[styles.previewTitle, { color: template.accent }]} numberOfLines={2}>
          {template.titleText}
        </Text>
        {/* Fields preview */}
        <View style={{ flex: 1, position: 'relative', marginTop: 4 }}>
          {template.fields.map((field: any) => (
            <View
              key={field.id}
              style={{
                position: 'absolute',
                left: field.x * (innerW - 8) + 2,
                top: field.y * (innerH * 0.65) + 2,
                width: field.w * (innerW - 8) - 4,
                height: field.h * (innerH * 0.65) - 4,
                borderRadius: 3,
                borderWidth: 0.8,
                borderColor: template.accent + '60',
                backgroundColor: 'white',
                justifyContent: 'flex-start',
                padding: 2,
              }}
            >
              <Text style={{ fontSize: 5, color: template.accent, fontWeight: '600' }} numberOfLines={1}>
                {field.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.previewName, { color: '#333' }]} numberOfLines={1}>
        {template.name}
      </Text>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function TemplateSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const selectedDate = params.selectedDate as string || '';

  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredTemplates = activeCategory === 'All'
    ? STANDARD_TEMPLATES
    : STANDARD_TEMPLATES.filter(t => t.category === activeCategory);

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;
    router.push({
      pathname: '/templateEditor',
      params: {
        templateId: selectedTemplate,
        selectedDate,
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Templates</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '500' }}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[
              styles.categoryChip,
              activeCategory === cat && { backgroundColor: colors.primary }
            ]}
          >
            <Text style={[
              styles.categoryText,
              { color: activeCategory === cat ? '#fff' : colors.textPrimary }
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section Title */}
      <Text style={[styles.sectionTitle, { color: colors.primary, paddingHorizontal: 16 }]}>
        {activeCategory === 'All' ? 'All Templates' : activeCategory}
      </Text>

      {/* Templates Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {filteredTemplates.map((template) => (
          <TouchableOpacity
            key={template.id}
            onPress={() => setSelectedTemplate(template.id)}
            activeOpacity={0.8}
          >
            <TemplatePreview
              template={template}
              isSelected={selectedTemplate === template.id}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom CTA */}
      {selectedTemplate && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.useBtn, { backgroundColor: colors.primary }]}
            onPress={handleUseTemplate}
            activeOpacity={0.85}
          >
            <Text style={styles.useBtnText}>Use This Template ✨</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Export template data so editor can use ──────────────────────────────────
export { STANDARD_TEMPLATES };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  categoryScroll: { maxHeight: 56 },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginRight: 8, backgroundColor: '#f0f0f0',
  },
  categoryText: { fontSize: 14, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingBottom: 100, gap: 8,
  },
  previewCard: {
    width: CARD_WIDTH, alignItems: 'center',
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
    marginBottom: 4, paddingBottom: 8,
  },
  previewInner: { borderRadius: 8, padding: 6, margin: 4 },
  previewTitle: { fontSize: 6, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  previewName: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center', paddingHorizontal: 4 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0',
  },
  useBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  useBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});