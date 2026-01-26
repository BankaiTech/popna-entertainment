import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generate automatic password for new customers.
 * Format: <first 4 letters of customer name><last 5 digits of mobile number>
 * 
 * Rules:
 * - Convert name part to lowercase
 * - Remove spaces and special characters
 * - Use only alphabet characters from name
 * - If name has less than 4 characters, use full name
 * - Always append last 5 digits of mobile
 * 
 * Examples:
 * - Name: "Ramesh Kumar", Mobile: 9876543210 → Password: rame43210
 * - Name: "Anu", Mobile: 9123456789 → Password: anu6789
 * 
 * @param name Customer name
 * @param mobile Customer mobile number (as string)
 * @returns Generated password
 * 
 * @note Replace with secure password generation & hashing later
 */
export function generateCustomerPassword(name: string, mobile: string): string {
  // Extract only alphabet characters from name and convert to lowercase
  const namePart = name
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
  
  // Use first 4 characters, or full name if less than 4 characters
  const namePrefix = namePart.length >= 4 ? namePart.slice(0, 4) : namePart;
  
  // Extract last 5 digits from mobile number
  // If mobile has fewer than 5 digits, use all available digits
  const mobileDigits = mobile.replace(/\D/g, ''); // Remove non-digits
  const mobileSuffix = mobileDigits.slice(-5); // Gets last 5 digits, or all if fewer than 5
  
  return `${namePrefix}${mobileSuffix}`;
}
