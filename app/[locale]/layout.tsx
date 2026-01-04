import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n';
import { Providers } from "@/components/providers/SessionProvider";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;

  // Validate locale with fallback (don't use notFound to avoid 404 loops)
  const locale = locales.includes(requestedLocale as any)
    ? requestedLocale
    : defaultLocale;

  // Providing all messages to the client
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
