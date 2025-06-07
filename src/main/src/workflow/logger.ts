// ===== 7. 로거 인터페이스 =====
// logger.ts

export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }
  
  export class ConsoleLogger implements Logger {
    debug(message: string, ...args: any[]): void {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
    
    info(message: string, ...args: any[]): void {
      console.log(`✅ [INFO] ${message}`, ...args);
    }
    
    warn(message: string, ...args: any[]): void {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
    
    error(message: string, ...args: any[]): void {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  }