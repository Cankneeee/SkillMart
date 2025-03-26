import PasswordResetForm from '@/components/PasswordResetForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Forget Password',
 description: 'Reset your SkillMart account password',
 keywords: ['password reset', 'forgot password', 'account recovery']
};

export default function PasswordResetPage() {
 return <PasswordResetForm />;
}