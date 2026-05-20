// server/utils/validators.ts

/**
 * Standard Strong Password Validation Rule
 * Constraints: Min 8 characters, 1 Uppercase, 1 Lowercase, 1 Number, 1 Special Character
 */
export const validatePasswordStrength = (password: string): boolean => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
};

/**
 * Generic Request Body Validator
 * Checks for HTML injection (XSS) in strings and validates password fields if present
 */
export const validateNoHtml = (data: any) => {
    const errors: any = {};

    const check = (obj: any) => {
        for (const key in obj) {
            const value = obj[key];

            // 1. HTML Validation Check (For XSS Protection)
            if (typeof value === "string" && /<[^>]*>?/gm.test(value)) {
                errors[key] = "HTML tags are not allowed";
            }

            // 2. Password Field Validation (Using the standalone helper)
            if (key === "password" && typeof value === "string" && value) {
                // Hashed password check to skip validation on database updates
                const isHashed = value.startsWith('$2a$') || value.startsWith('$2b$');

                if (!isHashed && !validatePasswordStrength(value)) {
                    errors[key] = "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.";
                }
            }

            // Recursive check for nested objects
            if (typeof value === "object" && value !== null) {
                check(value);
            }
        }
    };

    check(data);
    return errors;
};