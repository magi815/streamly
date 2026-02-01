import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootPage() {
  // Get Accept-Language header to detect preferred language
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';

  // Parse preferred language
  let locale = 'ko'; // default
  if (acceptLanguage.startsWith('en')) {
    locale = 'en';
  } else if (acceptLanguage.startsWith('ja')) {
    locale = 'ja';
  }

  // Redirect to locale-specific home page
  redirect(`/${locale}`);
}
