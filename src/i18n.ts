import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";

i18n
  .use(HttpApi)
  .use(initReactI18next) // Passes i18n down to react-i18next
  .use(LanguageDetector)
  .init({
    supportedLngs: ["en", "ua", "ru"],
    lng: "ua", // Default language
    fallbackLng: "en", // Fallback language
    debug: true,
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
    backend: {
      loadPath: "/src/locales/{{lng}}/translation.json",
    },
  });

export default i18n;
