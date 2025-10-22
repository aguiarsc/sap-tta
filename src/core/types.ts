/**
 * Core TypeScript types and interfaces for SAP Time Tracking Automation
 */

import { Page, Browser } from 'puppeteer-core';

// ============================================================================
// Time Tracking Types
// ============================================================================

/**
 * Type of time event (Spanish terms used by SAP)
 */
export type EventType = 'Entrada' | 'Salida';

/**
 * Day type for schedule selection
 */
export type DayType = 'friday' | 'regular';

/**
 * Time slot definition for scheduling
 */
export interface TimeSlot {
  time: string;
  type: EventType;
}

/**
 * Result of a time event creation attempt
 */
export interface EventResult {
  time: string;
  type: EventType;
  success: boolean;
  error?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Browser configuration options
 */
export interface BrowserConfig {
  headless: boolean;
  executablePath: string;
  defaultTimeout: number;
  defaultViewport?: {
    width: number;
    height: number;
  };
  args?: string[];
}

/**
 * User credentials for authentication
 */
export interface Credentials {
  username: string;
  password: string;
  totpSecret: string;
}

/**
 * CSS selectors for page elements
 */
export interface Selectors {
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
}

/**
 * Schedule configuration
 */
export interface Schedules {
  friday: TimeSlot[];
  regular: TimeSlot[];
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  url: string;
  userId: string;
  credentials: Credentials;
  browser: BrowserConfig;
  selectors: Selectors;
  schedules: Schedules;
  retry?: RetryConfig;
}

// ============================================================================
// Module Interfaces
// ============================================================================

/**
 * Browser controller interface
 */
export interface IBrowserController {
  launch(config: BrowserConfig): Promise<void>;
  navigate(url: string): Promise<void>;
  getPage(): Page;
  close(): Promise<void>;
}

/**
 * TOTP generator interface
 */
export interface ITOTPGenerator {
  generate(): string;
}

/**
 * Authenticator interface
 */
export interface IAuthenticator {
  isRequired(): Promise<boolean>;
  authenticate(): Promise<void>;
}

/**
 * Schedule manager interface
 */
export interface IScheduleManager {
  getCurrentSchedule(): {
    dayType: DayType;
    slots: TimeSlot[];
    availableSlots: TimeSlot[];
  };
}

/**
 * Timesheet navigator interface
 */
export interface ITimesheetNavigator {
  navigateToTimesheet(): Promise<void>;
}

/**
 * Time event creator interface
 */
export interface ITimeEventCreator {
  createEvent(slot: TimeSlot): Promise<EventResult>;
  createAllEvents(slots: TimeSlot[]): Promise<EventResult[]>;
}
