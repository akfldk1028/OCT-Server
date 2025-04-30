declare module 'spawn-rx' {
  export function findActualExecutable(cmd: string, args: string[]): { cmd: string; args: string[] };
} 