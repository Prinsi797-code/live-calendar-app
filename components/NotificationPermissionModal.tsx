import { Feather } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface NotificationPermissionModalProps {
    visible: boolean;
    onClose: () => void;
    colors: any;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
    visible,
    onClose,
    colors
}) => {
    const { t } = useTranslation();

    const openSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground }]}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Feather name="bell" size={40} color={colors.primary} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {t("notification_permission_required") || "Notification Permission Required"}
                    </Text>

                    {/* Description */}
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        {t("notification_permission_message") || 
                        "To receive reminders for your events, please enable notifications in your device settings."}
                    </Text>

                    {/* Benefits List */}
                    <View style={styles.benefitsList}>
                        <View style={styles.benefitItem}>
                            <Feather name="check-circle" size={20} color="#4CAF50" />
                            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                                {t("never_miss_events") || "Never miss important events"}
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Feather name="check-circle" size={20} color="#4CAF50" />
                            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                                {t("timely_reminders") || "Get timely reminders"}
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Feather name="check-circle" size={20} color="#4CAF50" />
                            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                                {t("stay_organized") || "Stay organized and on track"}
                            </Text>
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: colors.border }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                                {t("not_now") || "Not Now"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.allowButton, { backgroundColor: colors.primary }]}
                            onPress={openSettings}
                        >
                            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                {t("open_settings") || "Open Settings"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Text */}
                    <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                        {Platform.OS === 'ios' 
                            ? t("ios_settings_path") || "Settings → CalendarApp → Notifications"
                            : t("android_settings_path") || "Settings → Apps → CalendarApp → Notifications"
                        }
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    benefitsList: {
        width: '100%',
        marginBottom: 24,
        gap: 12,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    benefitText: {
        fontSize: 14,
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 16,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        // backgroundColor set via colors
    },
    allowButton: {
        // backgroundColor set via colors
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    infoText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});