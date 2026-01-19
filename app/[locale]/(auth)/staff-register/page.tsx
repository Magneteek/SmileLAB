'use client';

/**
 * Public Staff Registration Page
 *
 * Allows lab staff to self-register for SOP/training access
 * Automatically creates account with STAFF role
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Validation schema
const getRegisterSchema = (t: any) => z.object({
  name: z.string().min(2, t('auth.nameMin')),
  email: z.string().email(t('auth.invalidEmail')),
  password: z.string().min(6, t('auth.passwordMin')),
});

export default function StaffRegisterPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const registerSchema = getRegisterSchema(t);
  type RegisterFormData = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);

    try {
      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('auth.registerFailed'));
      }

      // Auto-login after registration
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but login failed - redirect to login
        router.push(`/${locale}/login?registered=true`);
        return;
      }

      // Redirect to staff dashboard
      router.push(`/${locale}/staff/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unexpectedError'));
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.register')}</CardTitle>
          <CardDescription>
            {t('auth.registerDescription')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.fullName')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.namePlaceholder')}
                disabled={isLoading}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                disabled={isLoading}
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
              <p className="text-xs text-gray-500">
                {t('auth.passwordHint')}
              </p>
            </div>

            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-900">
              <p>{t('auth.staffAccountInfo')}</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Button>
            
            <div className="text-center text-sm text-gray-600">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link href={`/${locale}/login`} className="text-blue-600 hover:underline">
                {t('auth.signIn')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
