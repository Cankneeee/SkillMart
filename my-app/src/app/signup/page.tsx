import SignUpForm from "@/components/SignUpForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Sign Up',
 description: 'Create a new account on SkillMart and start sharing your skills',
 keywords: ['signup', 'register', 'new account', 'skill sharing']
};

export default function SignUpPage() {
 return (
   <>
     <SignUpForm/>
   </>
 );
}