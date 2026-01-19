'use client';

/**
 * Reset Password Page
 *
 * Allows users to set new password using reset token
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Validation schema
const getResetPasswordSchema = (t: any) => z.object({
  password: z.string().min(6, t('auth.passwordMin')),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth.passwordsDoNotMatch'),
  path: ['confirmPassword'],
});

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const t = useTranslations();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string>('');

  // Unwrap params
  React.useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  const resetPasswordSchema = getResetPasswordSchema(t);
  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('auth.resetPasswordFailed'));
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/sl/login?passwordReset=true');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unexpectedError'));
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth.resetPassword')}</CardTitle>
          <CardDescription>
            {t('auth.resetPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{t('auth.passwordResetSuccess')}</AlertDescription>
              </Alert>
            )}

            {!success && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.newPassword')}</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>

          {!success && (
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? t('auth.resetting') : t('auth.resetPasswordButton')}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}
