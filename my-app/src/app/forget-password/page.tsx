import ForgetPasswordForm from '@/components/ForgetPasswordForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Reset Password',
 description: 'Reset your SkillMart account password',
 keywords: ['password reset', 'forgot password', 'account recovery']
};

export default function ForgetPasswordPage() {
 return <ForgetPasswordForm />;
}