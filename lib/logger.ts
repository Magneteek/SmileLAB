/**
 * Simple production logger
 * Replace console.log with structured logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: any;
}

class Logger {
  private log(level: LogLevel, message: string, data?: any, error?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data }),
      ...(error && { error: error instanceof Error ? error.message : error }),
    };

    // In production, you'd send to logging service (Sentry, LogRocket, etc.)
    // For now, structured console output
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '', error || '');
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any, data?: any) {
    this.log('error', message, data, error);

    // In production, report to error tracking service
    // TODO: Add Sentry integration
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger();
