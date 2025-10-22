import { Page } from 'puppeteer-core';
import { ITimesheetNavigator } from '../core/types';

interface NavigationSelectors {
  timeTrackingIcon: string;
  viewTimesheetLink: string;
  timeEventsButton: string;
}

export class TimesheetNavigator implements ITimesheetNavigator {
  private page: Page;
  private baseUrl: string;
  private userId: string;
  private selectors: NavigationSelectors;

  constructor(page: Page, baseUrl: string, userId: string) {
    this.page = page;
    this.baseUrl = baseUrl;
    this.userId = userId;
    
    this.selectors = {
      timeTrackingIcon: '#content > div > div.HomepageLayout_content__3KxJ8 > div:nth-child(1) > div > section > ul > li:nth-child(1) > ui5-busy-indicator > button',
      viewTimesheetLink: '#clockTimeDialog > ui5-busy-indicator > div > div.ClockTimeDialog_recentActivityHeader__Rdjud > ui5-link',
      timeEventsButton: '#sap\\.sf\\.attendancerecording\\.timesheets---timeRecordingView--timeRecordingPage-anchBar-sap\\.sf\\.attendancerecording\\.timesheets---timeRecordingView--timeEventsSection-anchor-text > span'
    };
  }

  private getCurrentDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDirectTimesheetUrl(): string {
    const dateString = this.getCurrentDateString();
    return `https://hcm-eu30.hr.cloud.sap/sf/timesheet#/timerecords/${this.userId}/${dateString}`;
  }

  async navigateToTimesheet(): Promise<void> {
    try {
      console.log('Attempting UI navigation to timesheet...');
      
      console.log('Waiting for Time Tracking icon...');
      await this.page.waitForSelector(this.selectors.timeTrackingIcon, {
        visible: true,
        timeout: 15000
      });
      
      await this.page.click(this.selectors.timeTrackingIcon);
      console.log('Clicked on Time Tracking icon');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Waiting for View Timesheet link...');
      await this.page.waitForSelector(this.selectors.viewTimesheetLink, {
        visible: true,
        timeout: 10000
      });
      
      await this.page.click(this.selectors.viewTimesheetLink);
      console.log('Clicked on View Timesheet link');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✓ UI navigation successful');
      return;
      
    } catch (uiError) {
      const errorMessage = uiError instanceof Error ? uiError.message : String(uiError);
      console.warn(`UI navigation failed: ${errorMessage}`);
      console.log('Attempting fallback: direct URL navigation...');
      
      try {
        if (!this.userId) {
          throw new Error('User ID not configured for direct URL navigation');
        }
        
        const directUrl = this.getDirectTimesheetUrl();
        console.log(`Navigating directly to: ${directUrl}`);
        
        await this.page.goto(directUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✓ Direct URL navigation successful');
        return;
        
      } catch (urlError) {
        const urlErrorMessage = urlError instanceof Error ? urlError.message : String(urlError);
        throw new Error(`All navigation methods failed. UI: ${errorMessage}, URL: ${urlErrorMessage}`);
      }
    }
  }
}
