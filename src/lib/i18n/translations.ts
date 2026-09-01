// Central translation dictionary. Nothing in components should hard-code
// user-facing strings — always go through t('key'). Add a language by
// adding one more key to each entry below; no component changes needed.

export type Lang = "en" | "kn" | "hi" | "ta" | "te";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
];

type Dict = Record<string, Record<Lang, string>>;

export const translations: Dict = {
  welcome: { en: "Welcome to Nivaar 👋", kn: "ನಿವಾರ್‌ಗೆ ಸ್ವಾಗತ 👋", hi: "निवार में आपका स्वागत है 👋", ta: "நிவாருக்கு வரவேற்கிறோம் 👋", te: "నివార్‌కు స్వాగతం 👋" },
  chooseLanguage: { en: "How would you like to use Nivaar?", kn: "ನೀವು ನಿವಾರ್ ಅನ್ನು ಹೇಗೆ ಬಳಸಲು ಬಯಸುತ್ತೀರಿ?", hi: "आप निवार का उपयोग कैसे करना चाहेंगे?", ta: "நீங்கள் நிவாரைப் பயன்படுத்த விரும்புவது எப்படி?", te: "మీరు నివార్‌ను ఎలా ఉపయోగించాలనుకుంటున్నారు?" },
  continue: { en: "Continue", kn: "ಮುಂದುವರಿಸಿ", hi: "जारी रखें", ta: "தொடரவும்", te: "కొనసాగించండి" },
  seeSomething: { en: "See something that needs fixing?", kn: "ಸರಿಪಡಿಸಬೇಕಾದ ಏನಾದರೂ ಕಂಡಿತೆ?", hi: "कुछ ऐसा दिखा जिसे ठीक करने की ज़रूरत है?", ta: "சரிசெய்ய வேண்டிய ஏதாவது தெரிகிறதா?", te: "సరిచేయాల్సిన ఏదైనా కనిపించిందా?" },
  takePhoto: { en: "Take a photo. We'll handle the rest.", kn: "ಫೋಟೋ ತೆಗೆಯಿರಿ. ಉಳಿದದ್ದನ್ನು ನಾವು ನೋಡಿಕೊಳ್ಳುತ್ತೇವೆ.", hi: "एक फोटो लें। बाकी हम संभाल लेंगे।", ta: "ஒரு புகைப்படம் எடுங்கள். மீதியை நாங்கள் பார்த்துக்கொள்கிறோம்.", te: "ఫోటో తీయండి. మిగతాది మేము చూసుకుంటాం." },
  tapToReport: { en: "Tap to report", kn: "ವರದಿ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ", hi: "रिपोर्ट करने के लिए टैप करें", ta: "புகாரளிக்க தட்டவும்", te: "నివేదించడానికి నొక్కండి" },
  active: { en: "Active", kn: "ಸಕ್ರಿಯ", hi: "सक्रिय", ta: "செயலில்", te: "యాక్టివ్" },
  resolved: { en: "Resolved", kn: "ಪರಿಹರಿಸಲಾಗಿದೆ", hi: "हल हो गया", ta: "தீர்க்கப்பட்டது", te: "పరిష్కరించబడింది" },
  showUsProblem: { en: "Show us the problem", kn: "ಸಮಸ್ಯೆ ತೋರಿಸಿ", hi: "समस्या दिखाएं", ta: "பிரச்சனையைக் காட்டுங்கள்", te: "సమస్యను చూపించండి" },
  analyzing: { en: "Analyzing your image…", kn: "ನಿಮ್ಮ ಚಿತ್ರವನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ…", hi: "आपकी छवि का विश्लेषण हो रहा है…", ta: "உங்கள் படத்தை பகுப்பாய்வு செய்கிறோம்…", te: "మీ చిత్రాన్ని విశ్లేషిస్తున్నాం…" },
  findingLocation: { en: "Finding your location…", kn: "ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ…", hi: "आपका स्थान ढूंढा जा रहा है…", ta: "உங்கள் இருப்பிடத்தைக் கண்டறிகிறோம்…", te: "మీ లొకేషన్‌ను కనుగొంటున్నాం…" },
  preparingReport: { en: "Preparing your report…", kn: "ನಿಮ್ಮ ವರದಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ…", hi: "आपकी रिपोर्ट तैयार की जा रही है…", ta: "உங்கள் அறிக்கையை தயார் செய்கிறோம்…", te: "మీ నివేదికను సిద్ధం చేస్తున్నాం…" },
  submitting: { en: "Submitting your report…", kn: "ನಿಮ್ಮ ವರದಿಯನ್ನು ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ…", hi: "आपकी रिपोर्ट सबमिट हो रही है…", ta: "உங்கள் அறிக்கையை சமர்ப்பிக்கிறோம்…", te: "మీ నివేదికను సమర్పిస్తున్నాం…" },
  reportSubmitted: { en: "Report submitted!", kn: "ವರದಿ ಸಲ್ಲಿಸಲಾಗಿದೆ!", hi: "रिपोर्ट सबमिट हो गई!", ta: "அறிக்கை சமர்ப்பிக்கப்பட்டது!", te: "నివేదిక సమర్పించబడింది!" },
  myReports: { en: "My reports", kn: "ನನ್ನ ವರದಿಗಳು", hi: "मेरी रिपोर्टें", ta: "எனது அறிக்கைகள்", te: "నా నివేదికలు" },
  nearby: { en: "Nearby", kn: "ಹತ್ತಿರದ", hi: "आस-पास", ta: "அருகில்", te: "సమీపంలో" },
  profile: { en: "Profile", kn: "ಪ್ರೊಫೈಲ್", hi: "प्रोफ़ाइल", ta: "சுயவிவரம்", te: "ప్రొఫైల్" },
};

export function t(key: keyof typeof translations, lang: Lang): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}
