import { Page } from 'puppeteer-core';
import { TOTPGenerator } from './totp';
import { Credentials, Selectors, IAuthenticator } from '../core/types';

export class Authenticator implements IAuthenticator {
  private page: Page;
  private totpGenerator: TOTPGenerator;
  private credentials: Credentials;
  private selectors: Selectors;

  constructor(
    page: Page,
    totpGenerator: TOTPGenerator,
    credentials: Credentials,
    selectors: Selectors
  ) {
    if (!page) {
      throw new Error('Page instance is required');
    }
    if (!totpGenerator) {
      throw new Error('TOTP generator is required');
    }

    this.page = page;
    this.totpGenerator = totpGenerator;
    this.credentials = credentials;
    this.selectors = selectors;
  }

  async isRequired(): Promise<boolean> {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const usernameInput = await this.page.$(this.selectors.usernameInput);
      if (usernameInput) {
        console.log('Authentication required: username input found');
        return true;
      }

      const totpInput = await this.page.$(this.selectors.totpInput);
      if (totpInput) {
        console.log('Authentication required: TOTP input found');
        return true;
      }

      const currentUrl = this.page.url();
      if (currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('keycloak')) {
        console.log('Authentication required: on login page');
        return true;
      }

      console.log('Authentication not required - already logged in');
      return false;
    } catch (error) {
      console.warn(`Error checking authentication requirement: ${(error as Error).message}`);
      return false;
    }
  }

  async authenticate(): Promise<void> {
    try {
      console.log('Starting authentication process...');

      const usernameInput = await this.page.$(this.selectors.usernameInput);
      
      if (usernameInput) {
        console.log('Username/password login required');
        
        await this.enterCredentials();
        
        console.log('Submitting credentials...');
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
          this.clickLoginButton()
        ]);
        
        console.log('Credentials submitted, waiting for next page...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('Username/password already filled or not required');
      }

      console.log('Checking for TOTP field...');
      console.log(`Looking for selector: ${this.selectors.totpInput}`);
      
      let totpInput = null;
      for (let i = 0; i < 10; i++) {
        totpInput = await this.page.$(this.selectors.totpInput);
        
        if (!totpInput) {
          totpInput = await this.page.$('input[name="totp"]');
        }
        
        if (!totpInput) {
          totpInput = await this.page.$('input[type="text"][autocomplete="off"]');
        }
        
        if (totpInput) {
          console.log('TOTP field found');
          break;
        }
        console.log(`TOTP field not found yet, waiting... (attempt ${i + 1}/10)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (totpInput) {
        console.log('TOTP authentication required');
        
        const totpCode = this.totpGenerator.generate();
        console.log(`TOTP code generated: ${totpCode}`);
        
        let workingSelector = this.selectors.totpInput;
        if (!(await this.page.$(this.selectors.totpInput))) {
          if (await this.page.$('input[name="totp"]')) {
            workingSelector = 'input[name="totp"]';
          } else if (await this.page.$('input[type="text"][autocomplete="off"]')) {
            workingSelector = 'input[type="text"][autocomplete="off"]';
          }
        }
        
        await this.enterTotpCode(totpCode, workingSelector);
        await this.submitTotpAuthentication();
        await this.waitForAuthenticationComplete();
      } else {
        console.warn('WARNING: TOTP field not found after 10 seconds');
        console.log('Current URL:', this.page.url());
        
        const currentUrl = this.page.url();
        if (currentUrl.includes('/companyEntry')) {
          throw new Error('Ended up on companyEntry page - TOTP was likely required but not completed');
        }
      }

      console.log('Authentication completed successfully');
    } catch (error) {
      throw new Error(`Authentication failed: ${(error as Error).message}`);
    }
  }

  private async enterCredentials(): Promise<void> {
    try {
      console.log('Entering username...');
      
      await this.page.waitForSelector(this.selectors.usernameInput, {
        visible: true,
        timeout: 10000
      });
      
      await this.page.click(this.selectors.usernameInput, { clickCount: 3 });
      await this.page.type(this.selectors.usernameInput, this.credentials.username, { delay: 50 });
      
      console.log('Username entered');
      console.log('Entering password...');
      
      await this.page.waitForSelector(this.selectors.passwordInput, {
        visible: true,
        timeout: 10000
      });
      
      await this.page.click(this.selectors.passwordInput, { clickCount: 3 });
      await this.page.type(this.selectors.passwordInput, this.credentials.password, { delay: 50 });
      
      console.log('Password entered');
    } catch (error) {
      throw new Error(`Failed to enter credentials: ${(error as Error).message}`);
    }
  }

  private async clickLoginButton(): Promise<void> {
    try {
      console.log('Waiting for login button...');
      await this.page.waitForSelector(this.selectors.loginButton, {
        visible: true,
        timeout: 10000
      });

      console.log('Clicking login button...');
      await this.page.click(this.selectors.loginButton);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      throw new Error(`Failed to click login button: ${(error as Error).message}`);
    }
  }

  private async enterTotpCode(code: string, selector: string): Promise<void> {
    try {
      console.log('Entering TOTP code...');
      console.log(`Using selector: ${selector}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.page.click(selector, { clickCount: 3 });
      await this.page.type(selector, code, { delay: 100 });
      
      console.log('TOTP code entered successfully');
    } catch (error) {
      throw new Error(`Failed to enter TOTP code: ${(error as Error).message}`);
    }
  }

  private async submitTotpAuthentication(): Promise<void> {
    try {
      console.log('Submitting TOTP authentication...');
      
      await this.page.keyboard.press('Enter');
      
      console.log('TOTP authentication submitted');
    } catch (error) {
      throw new Error(`Failed to submit TOTP authentication: ${(error as Error).message}`);
    }
  }

  private async waitForAuthenticationComplete(): Promise<void> {
    try {
      console.log('Waiting for authentication to complete...');
      
      await Promise.race([
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        new Promise(resolve => setTimeout(resolve, 8000))
      ]);

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalUrl = this.page.url();
      console.log(`Authentication process completed. Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('/companyEntry')) {
        console.warn('Warning: Redirected to company entry page. Company may not be properly set.');
      }
      
    } catch (error) {
      console.log('Navigation wait completed (timeout or success)');
      const currentUrl = this.page.url();
      console.log(`Current URL: ${currentUrl}`);
    }
  }
}
