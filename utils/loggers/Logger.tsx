
import React, { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';
import { ConsoleLogger } from './console-logger';

interface LoggerContextType {
  loggerClient:  ConsoleLogger;
}

const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

/**
 * useLogger is a hook that provides a logger instance with a prefix
 * @param prefix - Prefix to prepend to all log messages
 * @returns Object with log, error, and warn methods
 */
export const useLogger = (prefix: string) => {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }

  const { loggerClient } = context;

  const logWithPrefix = useCallback((event:string, message: string, ...args: any[]) => {
    loggerClient?.log(event, message, ...args);
  }, [prefix, loggerClient]);
  const errorWithPrefix = useCallback((event:string, message: string, ...args: any[]) => {
    loggerClient?.error(event, message, ...args);
  }, [prefix, loggerClient]);
  const warnWithPrefix = useCallback((event:string, message: string, ...args: any[]) => {
    loggerClient?.warn(event, message, ...args);
  }, [prefix, loggerClient]);


  return useMemo(() => ({
    log: logWithPrefix,
    error: errorWithPrefix,
    warn: warnWithPrefix,
  }), [logWithPrefix, errorWithPrefix, warnWithPrefix]);
};

interface LoggerProviderProps {
  children: ReactNode;
}

/**
 * LoggerProvider manages the logger initialization and provides
 * a logger instance via hook.
 * - Development: Uses ConsoleLogger
 * - Production: Uses FirebaseLogger
 */
export const LoggerProvider: React.FC<LoggerProviderProps> = ({ 
  children, 
}) => {
  
  const loggerClient = useMemo(() => {
    if (__DEV__) {
      // Development: Use console logger
      return new ConsoleLogger({ enabled: true });
    } else {
      // Production: Use Firebase Analytics logger
      // User ID will be set automatically in constructor after device ID is ready
     // return new FirebaseLogger({ enabled: true });
      return new ConsoleLogger({ enabled: true });
    }
  }, []);
  
  const value: LoggerContextType = useMemo(() => ({
    loggerClient,
  }), [loggerClient]);

  return <LoggerContext.Provider value={value} >{children}</LoggerContext.Provider>
}


export const useLoggerClient = () => {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error('useLoggerClient must be used within a LoggerProvider');
  }

  return context.loggerClient;
};
