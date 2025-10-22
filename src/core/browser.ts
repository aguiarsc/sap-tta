/**
 * Browser controller for managing Puppeteer browser lifecycle
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { BrowserConfig } from './types';

export class BrowserController {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launch(config: BrowserConfig): Promise<void> {
    const {
      headless = process.env.HEADLESS !== 'false',
      executablePath,
      defaultTimeout = 30000
    } = config;
    
    if (!executablePath) {
      throw new Error('Chrome executable path not configured. Set CHROME_PATH in .env file.');
    }

    try {
      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ];
      
      // Add maximized window argument when not in headless mode
      if (!headless) {
        args.push('--start-maximized');
      }
      
      this.browser = await puppeteer.launch({
        headless,
        executablePath,
        defaultViewport: headless ? {
          width: 1920,
          height: 1080
        } : null, // null viewport allows the browser to use full screen size
        args
      });

      this.page = await this.browser.newPage();
      this.page.setDefaultTimeout(defaultTimeout);
      this.page.setDefaultNavigationTimeout(defaultTimeout);

      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      console.log('Browser launched successfully');
    } catch (error) {
      throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    try {
      console.log(`Navigating to: ${url}`);
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log('Navigation completed');
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('Browser closed successfully');
      } catch (error) {
        throw new Error(`Failed to close browser: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }
}
