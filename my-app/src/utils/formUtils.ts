// utils/formUtils.ts
"use client";
import { useState } from "react";

// Generic type for form field values
type FormFields = Record<string, any>;

// Generic type for form field errors
type FormErrors<T extends FormFields> = Partial<Record<keyof T, string>>;

/**
 * Create a generic change handler for any input field
 */
export const createChangeHandler = <T extends FormFields>(
  setter: React.Dispatch<React.SetStateAction<T>>,
  errorSetter?: React.Dispatch<React.SetStateAction<FormErrors<T>>>,
  fieldName?: keyof T
) => {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const field = fieldName || name as keyof T;
    
    // Update the form state
    setter(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if errorSetter is provided
    if (errorSetter) {
      errorSetter(prev => {
        if (!prev[field]) return prev;
        
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
};

/**
 * Create nested change handler for objects with nested properties
 */
export const createNestedChangeHandler = <T extends FormFields>(
  setter: React.Dispatch<React.SetStateAction<T>>,
  parentField: keyof T,
  errorSetter?: React.Dispatch<React.SetStateAction<FormErrors<T>>>,
  errorField?: keyof T
) => {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Update the nested state
    setter(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [name]: value
      }
    }));
    
    // Clear error if errorSetter and errorField are provided
    if (errorSetter && errorField) {
      errorSetter(prev => {
        if (!prev[errorField]) return prev;
        
        const newErrors = { ...prev };
        delete newErrors[errorField];
        return newErrors;
      });
    }
  };
};

/**
 * Generic validation function - takes a values object and returns an errors object
 */
export type Validator<T extends FormFields> = (values: T) => FormErrors<T>;

/**
 * Run validation and return errors
 */
export const validateForm = <T extends FormFields>(
  values: T,
  validator: Validator<T>
): FormErrors<T> => {
  return validator(values);
};

/**
 * Check if form has errors
 */
export const hasErrors = <T extends FormFields>(errors: FormErrors<T>): boolean => {
  return Object.keys(errors).length > 0;
};

/**
 * Utility to create a form state hook that manages values, errors, and loading state
 */
export const useFormState = <T extends FormFields>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [loading, setLoading] = useState(false);
  
  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
  };
  
  const validateWith = (validator: Validator<T>): boolean => {
    const newErrors = validateForm(values, validator);
    setErrors(newErrors);
    return !hasErrors(newErrors);
  };
  
  return {
    values,
    setValues,
    errors,
    setErrors,
    loading,
    setLoading,
    resetForm,
    validateWith,
    changeHandler: createChangeHandler(setValues, setErrors),
    nestedChangeHandler: (parentField: keyof T) => 
      createNestedChangeHandler(setValues, parentField, setErrors)
  };
};

/**
 * Common form field validation functions
 */
export const fieldValidators = {
  required: (value: any, fieldName: string = 'This field'): string | null => {
    return !value?.toString().trim() ? `${fieldName} is required` : null;
  },
  
  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return value && !emailRegex.test(value) ? 'Please enter a valid email address' : null;
  },
  
  password: (value: string): string | null => {
    return value && value.length < 6 ? 'Password must be at least 6 characters' : null;
  },
  
  matches: (value: string, compareValue: string, fieldName: string = 'Password'): string | null => {
    return value !== compareValue ? `${fieldName}s do not match` : null;
  },
  
  numeric: (value: string): string | null => {
    return value && isNaN(Number(value)) ? 'Please enter a valid number' : null;
  }
};