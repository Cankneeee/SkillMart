export const validatePassword = (password: string): string | null => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
  
    if (password.length < minLength) return 'Password must be at least 8 characters long.';
    if (!hasUppercase) return 'Password must include at least one uppercase letter.';
    if (!hasLowercase) return 'Password must include at least one lowercase letter.';
    if (!hasNumber) return 'Password must include at least one number.';
    if (!hasSpecialChar) return 'Password must include at least one special character (!@#$%^&*).';
  
    return null; // No error
  };
  