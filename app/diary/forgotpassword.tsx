import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleForgotPassword = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmReset = async () => {
        try {
            // Save the name for pattern setup
            await AsyncStorage.setItem('diary_user_name', name.trim());
            setShowConfirmModal(false);
            
            // Navigate to pattern setup screen
            router.push('/diary/forgotpasswordpattern');
        } catch (error) {
            console.error('Error saving name:', error);
            Alert.alert('Error', 'Failed to save name');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    Forgot password
                </Text>
            </View>

            <View style={styles.content}>
                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                        Enter your name
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.cardBackground,
                                color: colors.textPrimary,
                            },
                        ]}
                        placeholder="Type your name"
                        placeholderTextColor={colors.textSecondary}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#8B4545' }]}
                    onPress={handleForgotPassword}
                >
                    <Text style={styles.buttonText}>Forgot password</Text>
                </TouchableOpacity>
            </View>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            Forgot password
                        </Text>
                        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                            Do you want reset your password on diary?
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                                    NO
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={handleConfirmReset}
                            >
                                <Text style={[styles.modalButtonText, { color: '#E57373' }]}>
                                    YES
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    inputContainer: {
        marginBottom: 40,
    },
    label: {
        fontSize: 16,
        marginBottom: 12,
        fontWeight: '500',
    },
    input: {
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
    },
    button: {
        borderRadius: 25,
        padding: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    modalMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        gap: 24,
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});