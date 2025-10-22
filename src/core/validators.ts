/**
 * Configuration validation utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, EventType, TimeSlot } from './types';

/**
 * Validates event type
 */
export function validateEventType(type: string): EventType {
  if (type === 'Entrada' || type === 'Salida') {
    return type as EventType;
  }
  
  throw new Error(`Invalid event type: ${type}. Must be 'Entrada' or 'Salida'`);
}

/**
 * Normalizes time slots from config file format to application format
 */
export function normalizeTimeSlots(slots: Array<{ time: string; type: string }>): TimeSlot[] {
  return slots.map(slot => ({
    time: slot.time,
    type: validateEventType(slot.type)
  }));
}

/**
 * Validates required environment variables
 */
export function validateEnvironmentVariables(): void {
  const required = [
    'TOTP_SECRET',
    'SAP_USERNAME',
    'SAP_PASSWORD',
    'SAP_USER_ID'
  ];
  
  const missing: string[] = [];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file.'
    );
  }
}

/**
 * Validates configuration structure
 */
export function validateConfig(config: AppConfig): void {
  // Validate URL
  if (!config.url) {
    throw new Error('Configuration error: url is required');
  }
  
  // Validate credentials
  if (!config.credentials.username || !config.credentials.password || !config.credentials.totpSecret) {
    throw new Error('Configuration error: all credentials (username, password, totpSecret) are required');
  }
  
  // Validate schedules
  if (!config.schedules.friday || !config.schedules.regular) {
    throw new Error('Configuration error: both friday and regular schedules are required');
  }
  
  if (config.schedules.friday.length === 0) {
    throw new Error('Configuration error: friday schedule cannot be empty');
  }
  
  if (config.schedules.regular.length === 0) {
    throw new Error('Configuration error: regular schedule cannot be empty');
  }
  
  // Validate selectors
  const requiredSelectors = [
    'usernameInput', 'passwordInput', 'loginButton', 'totpInput',
    'timeTrackingIcon', 'viewTimesheetLink', 'dateSelector',
    'timeEventsButton', 'createButton', 'timeInput', 'typeDropdown', 'submitButton'
  ];
  
  for (const selector of requiredSelectors) {
    if (!config.selectors[selector as keyof typeof config.selectors]) {
      throw new Error(`Configuration error: selector '${selector}' is required`);
    }
  }
}

/**
 * Validates configuration and prints detailed status
 * Used for the validate command
 */
export function validateConfigWithReport(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log('🔍 Validating configuration...\n');
  
  // Check .env file exists
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) {
    errors.push('❌ .env file not found. Copy .env.example to .env and configure it.');
  }
  
  // Check required environment variables
  const requiredVars: Record<string, string> = {
    'SAP_USERNAME': 'SAP username',
    'SAP_PASSWORD': 'SAP password',
    'TOTP_SECRET': 'TOTP secret',
    'SAP_USER_ID': 'SAP user ID',
    'CHROME_PATH': 'Chrome executable path'
  };
  
  for (const [varName, description] of Object.entries(requiredVars)) {
    if (!process.env[varName]) {
      errors.push(`❌ ${varName} not set (${description})`);
    } else if (process.env[varName]!.includes('your') || process.env[varName]!.includes('YOUR')) {
      warnings.push(`⚠️  ${varName} still has placeholder value`);
    } else {
      console.log(`✅ ${varName} is set`);
    }
  }
  
  // Check Chrome executable exists
  if (process.env.CHROME_PATH) {
    if (!fs.existsSync(process.env.CHROME_PATH)) {
      errors.push(`❌ Chrome executable not found at: ${process.env.CHROME_PATH}`);
    } else {
      console.log(`✅ Chrome executable found`);
    }
  }
  
  // Check config.json exists
  const configPath = path.join(__dirname, '..', '..', 'config.json');
  if (!fs.existsSync(configPath)) {
    errors.push('❌ config.json not found');
  } else {
    console.log(`✅ config.json found`);
    
    // Validate config.json structure
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(fileContent);
      
      if (!config.schedules || !config.schedules.friday || !config.schedules.regular) {
        errors.push('❌ config.json missing schedules configuration');
      } else {
        console.log(`✅ Schedules configured`);
      }
      
      if (!config.selectors) {
        errors.push('❌ config.json missing selectors configuration');
      } else {
        console.log(`✅ Selectors configured`);
      }
    } catch (e) {
      errors.push(`❌ config.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  
  // Print results
  console.log('\n' + '='.repeat(50));
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.log(w));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => console.log(e));
    console.log('\n❌ Configuration validation failed!');
    console.log('Please fix the errors above before running the script.\n');
    process.exit(1);
  }
  
  console.log('\n✅ Configuration validation passed!');
  console.log('You can now run: pnpm start\n');
}
