import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import i18n from "../../utils/i18n";

const LANGUAGES = [
    { code: "en", name: "English", flag: require("../../assets/language/uk.png") },
    { code: "pt", name: "Portuguese", flag: require("../../assets/language/portugal.png") },
    { code: "es", name: "Spanish", flag: require("../../assets/language/spanish.png") },
    { code: "fr", name: "French", flag: require("../../assets/language/french.png") },
    { code: "hi", name: "Hindi", flag: require("../../assets/language/india.png") },
    { code: "de", name: "German", flag: require("../../assets/language/german.png") },
    { code: "id", name: "Indonesian", flag: require("../../assets/language/indonesia.png") },
    { code: "zh", name: "Chinese", flag: require("../../assets/language/china.png") },
    { code: "ru", name: "Russian", flag: require("../../assets/language/russia.png") },
    { code: "ko", name: "Korean", flag: require("../../assets/language/korean.png") },
    { code: "it", name: "Italian", flag: require("../../assets/language/italian.png") }
];

export default function LanguagesScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState("en");

    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem("appLanguage");
            if (saved) setSelected(saved);
        })();
    }, []);

    // SAVE FUNCTION
    const handleSave = async () => {
        await AsyncStorage.setItem("appLanguage", selected);
        i18n.changeLanguage(selected);
        console.log(selected);
        router.replace("/");
    };


    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => setSelected(item.code)}
            style={styles.item}
        >
            <Image source={item.flag} style={styles.flag} />

            <Text style={styles.name}>{item.name}</Text>

            {selected === item.code && (
                <Feather name="check" size={22} color="#FF3B30" />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={26} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Language</Text>

                <TouchableOpacity onPress={handleSave}>
                    <Feather name="check" size={26} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            {/* LIST */}
            <FlatList
                data={LANGUAGES}
                keyExtractor={(item) => item.code}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// STYLES
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        padding: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 25,
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        color: "#fff",
        fontSize: 20,
    },
    item: {
        backgroundColor: "#1E1E1E",
        padding: 15,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    flag: {
        width: 32,
        height: 32,
        marginRight: 15,
        borderRadius: 5,
    },
    name: {
        color: "#fff",
        fontSize: 17,
        flex: 1,
    },
});
