import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useTheme } from "../contexts/ThemeContext";

export default function RepeatScreen() {
    const allParams = useLocalSearchParams();
    const { selectedRepeat, source, eventId } = allParams;
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [tempRepeatType, setTempRepeatType] = useState("does_not");
    const [tempDurationType, setTempDurationType] = useState("forever");
    const [tempTimesCount, setTempTimesCount] = useState("10");
    const [tempUntilDate, setTempUntilDate] = useState(new Date());

    const router = useRouter();
    const [showDateModal, setShowDateModal] = useState(false);

    const getParamValue = (value?: string | string[]) => {
        if (Array.isArray(value)) {
            return value[0];
        }
        return value;
    };

    // Use useEffect instead of useFocusEffect to avoid resetting state
    useEffect(() => {
        const repeatValue = getParamValue(allParams.repeatValue);
        const durationValue = getParamValue(allParams.repeatDuration);
        const countValue = getParamValue(allParams.repeatCount);
        const untilDateStr = getParamValue(allParams.repeatUntil);

        // Only set initial values, don't override user selections
        setTempRepeatType(repeatValue ?? "does_not");
        setTempDurationType(durationValue ?? "forever");
        setTempTimesCount(countValue ?? "10");

        if (untilDateStr) {
            try {
                const parsedDate = new Date(untilDateStr);
                if (!isNaN(parsedDate.getTime())) {
                    setTempUntilDate(parsedDate);
                } else {
                    setTempUntilDate(new Date());
                }
            } catch (error) {
                setTempUntilDate(new Date());
            }
        } else {
            setTempUntilDate(new Date());
        }
    }, []); // Empty dependency array - only run once on mount

    const repeatOptions = [
        { key: "does_not", label: t("does_not_repeat") },
        { key: "everyday", label: t("everyday") },
        { key: "every_week", label: t("every_week") },
        { key: "every_month", label: t("every_month") },
        { key: "every_year", label: t("every_year") },
    ];
    
    const durationOptions = [
        { key: "forever", label: t("forever") },
    ];

    const handleBack = () => {
        const targetPath = source === 'editEvent' ? '/editEvent' : '/addEvent';
        
        // Preserve ALL params when going back
        const params: any = {
            repeatValue: getParamValue(allParams.repeatValue) ?? "does_not",
            repeatDuration: getParamValue(allParams.repeatDuration) ?? "forever",
            repeatCount: getParamValue(allParams.repeatCount) ?? "10",
            repeatUntil: getParamValue(allParams.repeatUntil),
        };

        // Copy all other params to preserve form data
        Object.keys(allParams).forEach(key => {
            if (!['repeatValue', 'repeatDuration', 'repeatCount', 'repeatUntil', 'source', 'selectedRepeat'].includes(key)) {
                params[key] = allParams[key];
            }
        });

        if (source === 'editEvent' && eventId) {
            params.eventId = eventId;
        }

        router.replace({
            pathname: targetPath,
            params: params,
        });
    };

    const saveAndGoBack = () => {
        console.log("💾 Saving repeat selection:", tempRepeatType);

        const targetPath = source === 'editEvent' ? '/editEvent' : '/addEvent';
        const params: any = {
            repeatValue: tempRepeatType,
            repeatDuration: tempDurationType,
            repeatCount: tempTimesCount,
            repeatUntil: tempUntilDate.toISOString(),
        };

        // Preserve ALL other params including title, description, etc.
        Object.keys(allParams).forEach(key => {
            if (!['repeatValue', 'repeatDuration', 'repeatCount', 'repeatUntil', 'source', 'selectedRepeat'].includes(key)) {
                params[key] = allParams[key];
            }
        });

        if (source === 'editEvent' && eventId) {
            params.eventId = eventId;
        }

        console.log("📤 Navigating back with params:", params);

        router.replace({
            pathname: targetPath,
            params: params,
        });
    };

    const getTodayString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateForDisplay = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const getRepeatLabel = (key) => {
        const found = repeatOptions.find(i => i.key === key);
        return found ? found.label : "";
    };

    const getDurationLabel = (key) => {
        const found = durationOptions.find(i => i.key === key);
        return found ? found.label : "";
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header]}>
                <View style={styles.leftContainer}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}>
                        <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        {t("repeat")}
                    </Text>
                </View>

                <TouchableOpacity style={styles.headerRight} onPress={saveAndGoBack}>
                    <Feather name="check" size={24} color="#FF5252" />
                </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
                {tempRepeatType !== "does_not" && (
                    <Text style={[styles.smallText, { color: colors.textSecondary }]}>
                        {t("this_event_will_repeat")} {getRepeatLabel(tempRepeatType)?.toLowerCase()} {getDurationLabel(tempDurationType)?.toLowerCase()}
                    </Text>
                )}

                {repeatOptions.map(item => (
                    <TouchableOpacity
                        key={item.key}
                        style={[
                            styles.option,
                            { backgroundColor: colors.cardBackground },
                        ]}
                        onPress={() => setTempRepeatType(item.key)}
                    >
                        <Text style={[styles.text, { color: colors.textPrimary }]}>
                            {item.label}
                        </Text>

                        <View
                            style={[
                                styles.circle,
                                tempRepeatType === item.key && styles.circleSelected,
                            ]}
                        >
                            {tempRepeatType === item.key && (
                                <Feather name="check" size={14} color="#fff" />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Modal transparent visible={showDateModal} animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowDateModal(false)}
                    />
                    <View
                        style={[
                            styles.modalBox,
                            { backgroundColor: colors.cardBackground },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                {t("select_end_date")}
                            </Text>
                        </View>

                        <Calendar
                            minDate={getTodayString()}
                            onDayPress={(day) => {
                                setTempUntilDate(new Date(day.dateString));
                                setShowDateModal(false);
                            }}
                            theme={{
                                backgroundColor: colors.cardBackground,
                                calendarBackground: colors.cardBackground,
                                textSectionTitleColor: colors.textPrimary,
                                selectedDayBackgroundColor: '#FF5252',
                                selectedDayTextColor: '#FFFFFF',
                                todayTextColor: '#FF5252',
                                dayTextColor: colors.textPrimary,
                                textDisabledColor: colors.textSecondary,
                                monthTextColor: colors.textPrimary,
                                textMonthFontWeight: '600',
                            }}
                            markedDates={{
                                [tempUntilDate.toISOString().split('T')[0]]: {
                                    selected: true,
                                    selectedColor: '#FF5252'
                                }
                            }}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={() => setShowDateModal(false)}
                                style={styles.modalButton}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                                    {t("cancel")}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowDateModal(false)}
                                style={styles.modalButton}
                            >
                                <Text style={[styles.modalButtonText, { color: '#FF5252' }]}>
                                    {t("ok")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 50,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerRight: {
        padding: 4,
    },
    smallText: {
        fontSize: 14,
        marginBottom: 16,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    text: {
        fontSize: 16,
    },
    circle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#888',
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleSelected: {
        backgroundColor: '#FF5252',
        borderColor: '#FF5252',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    modalBox: {
        width: '85%',
        borderRadius: 12,
        padding: 16,
    },
    modalHeader: {
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 16,
    },
    modalButton: {
        padding: 8,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});