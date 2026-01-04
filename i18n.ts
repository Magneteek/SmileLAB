import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'sl'] as const;
export const defaultLocale = 'sl' as const;  // Slovenian as default for production

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is a Promise in next-intl v4+
  const requested = await requestLocale;

  // Validate and fallback to default if invalid
  const locale = locales.includes(requested as Locale)
    ? requested as Locale
    : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
