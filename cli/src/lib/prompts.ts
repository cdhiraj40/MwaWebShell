import {
  confirm as promptConfirm,
  input as promptInput,
  password as promptPassword,
} from "@inquirer/prompts";
import { stdin as input, stdout as output } from "node:process";

interface TextPromptOptions {
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
}

export interface PromptSession {
  text(message: string, options?: TextPromptOptions): Promise<string>;
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
  password(message: string, options?: TextPromptOptions): Promise<string>;
  isInteractive(): boolean;
  close(): void;
}

export class Prompter implements PromptSession {
  private readonly interactive: boolean;

  constructor(interactive?: boolean) {
    this.interactive = interactive ?? Boolean(input.isTTY && output.isTTY);
  }

  async text(message: string, options: TextPromptOptions = {}): Promise<string> {
    if (!this.interactive) {
      if (options.defaultValue !== undefined) {
        return options.defaultValue;
      }
      throw new Error(`Missing required value for "${message}" in non-interactive mode.`);
    }

    while (true) {
      const rawValue = await promptInput({
        message,
        default: options.defaultValue,
        validate: (value: string) => options.validate?.(value) ?? true,
      });
      const value = rawValue.trim() || options.defaultValue || "";
      const validationError = options.validate?.(value);
      if (!validationError) {
        return value;
      }
      console.error(`Error: ${validationError}`);
    }
  }

  isInteractive(): boolean {
    return this.interactive;
  }

  async confirm(message: string, defaultValue = true): Promise<boolean> {
    if (!this.interactive) {
      return defaultValue;
    }
    return promptConfirm({
      message,
      default: defaultValue,
    });
  }

  async password(message: string, options: TextPromptOptions = {}): Promise<string> {
    if (!this.interactive) {
      if (options.defaultValue !== undefined) {
        return options.defaultValue;
      }
      throw new Error(`Missing required value for "${message}" in non-interactive mode.`);
    }

    while (true) {
      const value = await promptPassword({
        message,
        mask: true,
        validate: (candidate: string) => options.validate?.(candidate) ?? true,
      });
      const finalValue = value.trim() || options.defaultValue || "";
      const validationError = options.validate?.(finalValue);
      if (!validationError) {
        return finalValue;
      }
      console.error(`Error: ${validationError}`);
    }
  }

  close(): void {
    // No-op. @inquirer/prompts manages its own lifecycle per prompt call.
  }
}
