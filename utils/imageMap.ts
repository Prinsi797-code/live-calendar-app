// Remove this:
// import { getTemplateImage } from '../utils/imageMap';
// const templateBgImage = getTemplateImage(eventData.templateImageKey);

// Add this map instead:
const bgImageMap: { [key: string]: any } = {
    'light': require('../assets/temp/light.jpeg'),
    'light1': require('../assets/temp/light1.jpeg'),
    'light2': require('../assets/temp/light2.jpeg'),
    'light3': require('../assets/temp/light3.jpeg'),
    'light4': require('../assets/temp/light4.jpeg'),
    'light5': require('../assets/temp/light5.jpeg'),
    'light6': require('../assets/temp/light6.jpeg'),
    'light7': require('../assets/temp/light7.jpeg'),
    'light8': require('../assets/temp/light8.jpeg'),
    'dark': require('../assets/temp/dark.jpeg'),
    'dark1': require('../assets/temp/dark1.jpeg'),
    'dark2': require('../assets/temp/dark2.jpeg'),
    'dark3': require('../assets/temp/dark3.jpeg'),
    'dark4': require('../assets/temp/dark4.jpeg'),
    'dark5': require('../assets/temp/dark5.jpeg'),
    'dark6': require('../assets/temp/dark6.jpeg'),
    'dark7': require('../assets/temp/dark7.jpeg'),
    'dark8': require('../assets/temp/dark8.jpeg'),
};
const templateBgImage = eventData.bgImage ? bgImageMap[eventData.bgImage] : null;