/**
 * Console logger strategy - logs to console only
 * Simple logger that outputs to React Native console
 */

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

interface ConsoleLoggerOptions {
  enabled?: boolean;
}

export class ConsoleLogger {
  private enabled: boolean;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.enabled = options.enabled !== false;
  }

  /**
   * Format log message with timestamp
   */
  private formatMessage(level: LogLevel, message: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    return `[${timestamp}] [${levelUpper}] ${message}`;
  }

  /**
   * Log a message to console
   */
  private logToConsole(level: LogLevel, message: string, args: any[]): void {
    if (!this.enabled) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, args);
    
    // Use appropriate console method based on level
    switch (level) {
      case 'error':
        if (args.length > 0) {
          console.error(formattedMessage, ...args);
        } else {
          console.error(formattedMessage);
        }
        break;
      case 'warn':
        if (args.length > 0) {
          console.warn(formattedMessage, ...args);
        } else {
          console.warn(formattedMessage);
        }
        break;
      case 'info':
        if (args.length > 0) {
          console.info(formattedMessage, ...args);
        } else {
          console.info(formattedMessage);
        }
        break;
      case 'debug':
        if (args.length > 0) {
          console.debug(formattedMessage, ...args);
        } else {
          console.debug(formattedMessage);
        }
        break;
      case 'log':
      default:
        if (args.length > 0) {
          console.log(formattedMessage, ...args);
        } else {
          console.log(formattedMessage);
        }
        break;
    }
  }

  /**
   * Public log methods
   */
  log(message: string, ...args: any[]): void {
    this.logToConsole('log', message, args);
  }

  error(message: string, ...args: any[]): void {
    this.logToConsole('error', message, args);
  }

  warn(message: string, ...args: any[]): void {
    this.logToConsole('warn', message, args);
  }

  info(message: string, ...args: any[]): void {
    this.logToConsole('info', message, args);
  }

  debug(message: string, ...args: any[]): void {
    this.logToConsole('debug', message, args);
  }
}

