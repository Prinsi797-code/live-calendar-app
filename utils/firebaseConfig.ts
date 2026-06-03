import { getApps, initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: "AIzaSyAuipJ1dswsNBCx8BzIvuJRkzeYRBozJzQ",
//   authDomain: "calendar-app-5fa21.firebaseapp.com",
//   projectId: "calendar-app-5fa21",
//   storageBucket: "calendar-app-5fa21.firebasestorage.app",
//   messagingSenderId: "851596816426",
//   appId: "1:851596816426:web:c1b6272b529dabab8bd353",
//   measurementId: "G-PBBYVBKL6D"
// };

// live data
const firebaseConfig = {
  apiKey: "AIzaSyBvCx7x8KR_avnavFvb-E-jMrA1_E8hsEo",
  authDomain: "calendar-app-ba9d6.firebaseapp.com",
  projectId: "calendar-app-ba9d6",
  storageBucket: "calendar-app-ba9d6.firebasestorage.app",
  messagingSenderId: "557672501111",
  appId: "1:557672501111:web:7f5c9952b3fa3fd9849b72",
  measurementId: "G-PSLGEMZW9G"
};

// Initialize Firebase Only Once
let app;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const db = getFirestore(app);

// ------------------------------
// FETCH APP CONFIG FROM FIRESTORE
// ------------------------------

export async function fetchAppConfig() {
  try {
    const ref = doc(db, "configs", "app_config"); 
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      console.log("Firestore Config Loaded:", data);
      return data;
    } else {
      console.log("No config document found!");
      return null;
    }
  } catch (error) {
    console.log("Firestore Config Fetch Failed:", error);
    return null;
  }
}
