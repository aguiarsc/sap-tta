/**
 * Configuration loader
 * Loads configuration from config.json and environment variables
 */

import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { AppConfig, BrowserConfig } from './types';
import { 
  validateEnvironmentVariables, 
  validateConfig, 
  normalizeTimeSlots,
  validateConfigWithReport 
} from './validators';

// Load environment variables
dotenvConfig();

/**
 * Configuration file structure (from config.json)
 */
interface ConfigFile {
  url: string;
  browser: {
    defaultViewport?: {
      width: number;
      height: number;
    };
    args?: string[];
    defaultTimeout: number;
  };
  selectors: {
    usernameInput: string;
    passwordInput: string;
    loginButton: string;
    totpInput: string;
    timeTrackingIcon: string;
    viewTimesheetLink: string;
    dateSelector: string;
    timeEventsButton: string;
    createButton: string;
    timeInput: string;
    typeDropdown: string;
    submitButton: string;
  };
  schedules: {
    friday: Array<{ time: string; type: string }>;
    regular: Array<{ time: string; type: string }>;
  };
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

/**
 * Gets the default Chrome/Chromium path based on the operating system
 */
function getDefaultChromePath(): string {
  const platform = process.platform;
  
  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    return '/usr/bin/google-chrome';
  }
}

/**
 * Loads and merges configuration from config.json and environment variables
 */
export function loadConfig(): AppConfig {
  // Validate environment variables first
  validateEnvironmentVariables();
  
  // Load config.json
  const configPath = path.join(__dirname, '..', '..', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  let configFile: ConfigFile;
  try {
    const fileContent = fs.readFileSync(configPath, 'utf8');
    configFile = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse config.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Build browser configuration (removing redundant options)
  const browserConfig: BrowserConfig = {
    headless: process.env.HEADLESS !== 'false',
    executablePath: process.env.CHROME_PATH || getDefaultChromePath(),
    defaultTimeout: configFile.browser.defaultTimeout
  };
  
  // Build complete configuration
  const config: AppConfig = {
    url: configFile.url,
    userId: process.env.SAP_USER_ID!,
    credentials: {
      username: process.env.SAP_USERNAME!,
      password: process.env.SAP_PASSWORD!,
      totpSecret: process.env.TOTP_SECRET!
    },
    browser: browserConfig,
    selectors: configFile.selectors,
    schedules: {
      friday: normalizeTimeSlots(configFile.schedules.friday),
      regular: normalizeTimeSlots(configFile.schedules.regular)
    },
    retry: configFile.retry
  };
  
  // Validate the complete configuration
  validateConfig(config);
  
  return config;
}

// Export for CLI usage
export { validateConfigWithReport };

// Run validation if called directly
if (require.main === module) {
  validateConfigWithReport();
}
