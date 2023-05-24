import djs from 'dayjs';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/fr';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/it';
import 'dayjs/locale/he';
import 'dayjs/locale/ro';
import 'dayjs/locale/bg';

import localizedFormat from 'dayjs/plugin/localizedFormat';

djs.extend(localizedFormat);
if (typeof window !== 'undefined') {
  const navLangs =
    navigator.languages || (navigator.language ? [navigator.language] : false);

  const loaded = ['en-gb', 'fr', 'de', 'zh-cn', 'he', 'es', 'it', 'ro', 'bu'];

  const checkLocale = (locale: string) => {
    if (['en', 'en-us'].includes(locale)) {
      return true;
    }

    if (locale === 'zn') {
      djs.locale('zh-cn');
      return true;
    }

    if (loaded.includes(locale)) {
      djs.locale(locale);
      return true;
    }
    return false;
  };

  if (navLangs) {
    navLangs.some(function (lang) {
      const locale = lang.toLowerCase();
      return (
        checkLocale(locale) ||
        (locale.includes('-') && checkLocale(locale.split('-')[0]))
      );
    });
  }
}
export const dayjs = djs;
