import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { id } from './id.js';

void i18n.use(initReactI18next).init({
  resources: { 'id-ID': { translation: id } },
  lng: 'id-ID',
  fallbackLng: 'id-ID',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
