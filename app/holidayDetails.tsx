import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function HolidayDetails() {
  const router = useRouter();
  const { title, date, alert, startTime, endTime, } = useLocalSearchParams();
  const { colors, theme } = useTheme();

  const formatTime = (time) => {
    if (!time) return null;
    const [hour, minute] = time.split(':');
    const dateObj = new Date();
    dateObj.setHours(hour);
    dateObj.setMinutes(minute);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleShare = async () => {
        try {
            const result = await Share.share({
                message: "Try this awesome app: https://apps.apple.com/in/app/calander-2025/id6754905789"
            });
            if (result.action === Share.sharedAction) {
                console.log("Shared successfully");
            }
        } catch (error) {
            console.log("Error sharing:", error);
        }
    };

  const eventTime =
    startTime && endTime
      ? `${formatTime(startTime)} - ${formatTime(endTime)}`
      : "12:00 AM";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ---------- HEADER ---------- */}
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Event Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleShare}>
            <Feather name="share" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- CONTENT CARD ---------- */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date Time</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{date} , {eventTime}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Alert</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{"On the day at 9 AM"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  card: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
  },

  row: {
    flexDirection: "row",
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    padding: 4,
  },

  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  }
});
