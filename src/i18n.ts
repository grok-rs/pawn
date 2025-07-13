import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

const savedLanguage = localStorage.getItem('language');

i18n
  .use(HttpApi)
  .use(initReactI18next) // Passes i18n down to react-i18next
  .use(LanguageDetector)
  .init({
    supportedLngs: ["en", "ua", "ru"],
    lng: savedLanguage || "ua", // Use saved language or default to Ukrainian
    fallbackLng: "en", // Fallback language
    debug: false,
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
    backend: {
      loadPath: "/src/locales/{{lng}}/translation.json",
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
