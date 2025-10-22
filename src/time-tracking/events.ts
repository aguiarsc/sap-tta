import { Page } from 'puppeteer-core';
import { TimeSlot, EventResult, Selectors } from '../core/types';

export class TimeEventCreator {
  private page: Page;
  private selectors: Selectors;

  constructor(page: Page, selectors: Selectors) {
    this.page = page;
    this.selectors = selectors;
  }

  async createAllEvents(slots: TimeSlot[]): Promise<EventResult[]> {
    const results: EventResult[] = [];
    
    console.log(`Creating ${slots.length} time events...`);
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      console.log(`\nCreating event ${i + 1}/${slots.length}: ${slot.type} at ${slot.time}`);
      
      try {
        const result = await this.createEvent(slot);
        results.push(result);
        
        if (result.success) {
          console.log(`✓ Event created successfully: ${slot.type} at ${slot.time}`);
        } else {
          console.error(`✗ Failed to create event: ${result.error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        const errorResult: EventResult = {
          time: slot.time,
          type: slot.type,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
        results.push(errorResult);
        console.error(`✗ Error creating event: ${errorResult.error}`);
      }
    }
    
    return results;
  }

  async createEvent(slot: TimeSlot): Promise<EventResult> {
    try {
      await this.clickTimeEventsButton();
      await this.clickCreateButton();
      await this.fillTimeAndType(slot.time, slot.type);
      await this.submitEvent();
      
      return {
        time: slot.time,
        type: slot.type,
        success: true
      };
      
    } catch (error) {
      return {
        time: slot.time,
        type: slot.type,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async clickTimeEventsButton(): Promise<void> {
    try {
      await this.page.waitForSelector(this.selectors.timeEventsButton, {
        visible: true,
        timeout: 10000
      });
      
      await this.page.click(this.selectors.timeEventsButton);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      throw new Error(`Failed to click Time Events button: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async clickCreateButton(): Promise<void> {
    try {
      await this.page.waitForSelector(this.selectors.createButton, {
        visible: true,
        timeout: 10000
      });
      
      await this.page.click(this.selectors.createButton);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      throw new Error(`Failed to click Create button: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private formatTimeForInput(time: string): string {
    const timeWithoutColon = time.replace(':', '');
    return timeWithoutColon.replace(/^0+/, '') || '0';
  }

  private async fillTimeAndType(time: string, type: string): Promise<void> {
    try {
      await this.page.waitForSelector(this.selectors.timeInput, {
        visible: true,
        timeout: 10000
      });
      
      const formattedTime = this.formatTimeForInput(time);
      console.log(`  - Converting time: ${time} -> ${formattedTime}`);
      
      await this.page.click(this.selectors.timeInput, { clickCount: 3 });
      await this.page.type(this.selectors.timeInput, formattedTime);
      
      console.log(`  - Filled time: ${formattedTime}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`  - Selecting type: ${type}`);
      console.log(`  - Strategy 1: Typing directly in input field`);
      
      try {
        await this.page.waitForSelector(this.selectors.typeDropdown, {
          visible: true,
          timeout: 10000
        });
        
        await this.page.click(this.selectors.typeDropdown);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.page.click(this.selectors.typeDropdown, { clickCount: 3 });
        
        await this.page.type(this.selectors.typeDropdown, type, { delay: 100 });
        
        console.log(`  - Typed "${type}" in dropdown input`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.page.keyboard.press('Enter');
        console.log(`  - Pressed Enter to confirm selection`);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`  ✓ Type selected successfully using direct input`);
        
      } catch (directInputError) {
        console.log(`  - Strategy 1 failed: ${directInputError instanceof Error ? directInputError.message : String(directInputError)}`);
        console.log(`  - Strategy 2: Trying click-based selection`);
        
        try {
          await this.page.click(this.selectors.typeDropdown);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const selectorsToTry = type === 'Entrada' 
            ? ['#__item15-titleText', '#__item15-content > div', '#__item15', '#sap\\.sf\\.attendancerecording\\.timesheets---timeRecordingView--vh-timeEventTypeCode-popup']
            : ['#__item19', '#__item19-titleText', '#__item19-content > div'];
          
          let success = false;
          
          for (const selector of selectorsToTry) {
            try {
              console.log(`  - Trying selector: ${selector}`);
              const element = await this.page.$(selector);
              
              if (element) {
                await element.click();
                console.log(`  ✓ Successfully clicked selector: ${selector}`);
                success = true;
                break;
              } else {
                console.log(`  - Selector not found: ${selector}`);
              }
            } catch (e) {
              console.log(`  - Selector failed: ${selector} - ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          
          if (!success) {
            console.log(`  - Strategy 3: Searching by text content`);
            
            const typeSelected = await this.page.evaluate((targetType: string) => {
              const selectors = [
                'li[role="option"]',
                'ui5-li',
                '[role="option"]',
                'li',
                '.sapMSelectListItem',
                '.sapMListItem',
                '[id*="item"]'
              ];
              
              for (const selector of selectors) {
                const options = Array.from(document.querySelectorAll(selector));
                
                for (const option of options) {
                  const element = option as HTMLElement;
                  const text = element.textContent?.toLowerCase().trim() || '';
                  if (text === targetType.toLowerCase() || text.includes(targetType.toLowerCase())) {
                    console.log(`Found and clicking: "${text}"`);
                    element.click();
                    return true;
                  }
                }
              }
              
              return false;
            }, type);
            
            if (!typeSelected) {
              throw new Error(`All strategies failed to select type: ${type}`);
            }
            
            console.log(`  ✓ Type selected using text search`);
          }
          
        } catch (clickError) {
          throw new Error(`Failed to select type after trying all strategies: ${clickError instanceof Error ? clickError.message : String(clickError)}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      throw new Error(`Failed to fill time and type: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async submitEvent(): Promise<void> {
    try {
      await this.page.waitForSelector(this.selectors.submitButton, {
        visible: true,
        timeout: 10000
      });
      
      await this.page.click(this.selectors.submitButton);
      console.log('  - Submitted event');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      throw new Error(`Failed to submit event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
