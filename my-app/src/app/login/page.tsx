import LoginForm from "@/components/LoginForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to SkillMart and access your skill-sharing account',
  keywords: ['login', 'sign in', 'account access']
};

export default function SignUpPage() {
  return (
  <>
    <LoginForm/>
  </>
  );
}
