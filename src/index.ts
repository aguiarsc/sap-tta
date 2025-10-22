/**
 * Main entry point for SAP SuccessFactors Time Tracking Automation
 */

import { loadConfig } from './core/config';
import { BrowserController } from './core/browser';
import { ScheduleManager } from './scheduling/schedule';
import { TOTPGenerator } from './authentication/totp';
import { Authenticator } from './authentication/auth';
import { TimesheetNavigator } from './time-tracking/navigation';
import { TimeEventCreator } from './time-tracking/events';

/**
 * Formats timestamp for logging
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Structured console logging
 */
const log = {
  info: (message: string, data?: any) => {
    console.log(`[${timestamp()}] [INFO] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[${timestamp()}] [WARN] ${message}`);
    if (data) {
      console.warn(JSON.stringify(data, null, 2));
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[${timestamp()}] [ERROR] ${message}`);
    if (error) {
      console.error(error instanceof Error ? error.stack : error);
    }
  }
};

/**
 * Main execution function
 */
async function main(): Promise<void> {
  let browserController: BrowserController | null = null;
  let successfulEvents = 0;
  let totalEvents = 0;

  try {
    log.info('Starting Time Tracking Automation');
    
    // Load configuration
    log.info('Loading configuration...');
    const config = loadConfig();
    log.info('Configuration loaded successfully');

    // Determine schedule based on current day
    log.info('Determining schedule for today...');
    const scheduleManager = new ScheduleManager(config.schedules);
    const schedule = scheduleManager.getCurrentSchedule();
    
    log.info(`Schedule determined: ${schedule.dayType}`, {
      totalSlots: schedule.slots.length,
      availableSlots: schedule.availableSlots.length,
      slots: schedule.availableSlots
    });
    
    // Check if there are any events to create
    if (schedule.availableSlots.length === 0) {
      log.warn('No time events available to create at this time');
      log.info('All scheduled events are in the future');
      return;
    }

    // Initialize browser
    log.info('Launching browser...');
    browserController = new BrowserController();
    await browserController.launch(config.browser);
    log.info('Browser launched successfully');

    const page = browserController.getPage();

    // Navigate to SAP SuccessFactors
    log.info('Navigating to SAP SuccessFactors...');
    await browserController.navigate(config.url);
    log.info('Navigation successful');

    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Authenticate if required
    log.info('Checking if authentication is required...');
    const totpGenerator = new TOTPGenerator(config.credentials.totpSecret);
    const authenticator = new Authenticator(
      page,
      totpGenerator,
      config.credentials,
      config.selectors
    );
    
    const authRequired = await authenticator.isRequired();
    
    if (authRequired) {
      log.info('Authentication required, starting authentication flow...');
      await authenticator.authenticate();
      log.info('Authentication successful');
      
      // Check if we're on the companyEntry page and need to navigate to home
      const currentUrl = page.url();
      if (currentUrl.includes('/companyEntry')) {
        log.warn('Detected companyEntry page, navigating to home with company parameter...');
        try {
          await browserController.navigate(config.url);
          await new Promise(resolve => setTimeout(resolve, 3000));
          log.info('Successfully navigated to home page with company');
        } catch (error) {
          log.warn('Failed to navigate to home page, continuing anyway...');
        }
      }
    } else {
      log.info('Authentication not required (already logged in)');
    }

    // Navigate to timesheet page
    log.info('Navigating to timesheet page...');
    const timesheetNavigator = new TimesheetNavigator(page, config.url, config.userId);
    await timesheetNavigator.navigateToTimesheet();
    log.info('Successfully navigated to timesheet page');

    // Create time events
    log.info(`Creating ${schedule.availableSlots.length} time events...`);
    const timeEventCreator = new TimeEventCreator(page, config.selectors);
    
    const eventResults = await timeEventCreator.createAllEvents(schedule.availableSlots);
    
    // Count results
    totalEvents = eventResults.length;
    successfulEvents = eventResults.filter(r => r.success).length;
    const failedEvents = eventResults.filter(r => !r.success);
    
    // Log results
    if (failedEvents.length > 0) {
      log.warn(`${failedEvents.length} event(s) failed to create`, {
        failedEvents: failedEvents.map(e => ({
          time: e.time,
          type: e.type,
          error: e.error
        }))
      });
    }

    log.info(`Successfully created ${successfulEvents}/${totalEvents} time events`);

    if (successfulEvents > 0) {
      log.info('Time tracking automation completed successfully');
    } else {
      log.error('Time tracking automation completed with errors - no events were created');
      process.exit(1);
    }

  } catch (error) {
    log.error('Fatal error during execution', error);
    process.exit(1);
  } finally {
    // Clean up - close browser
    if (browserController) {
      try {
        log.info('Closing browser...');
        await browserController.close();
        log.info('Browser closed successfully');
      } catch (error) {
        log.error('Error closing browser', error);
      }
    }

    // Print summary
    if (totalEvents > 0) {
      console.log('\n' + '='.repeat(50));
      console.log('EXECUTION SUMMARY');
      console.log('='.repeat(50));
      console.log(`Total events: ${totalEvents}`);
      console.log(`Successful: ${successfulEvents}`);
      console.log(`Failed: ${totalEvents - successfulEvents}`);
      console.log('='.repeat(50) + '\n');
    }
  }
}

// Execute main function
main().catch(error => {
  console.error(`[${timestamp()}] [ERROR] Unhandled error in main:`, error);
  process.exit(1);
});
