import { useState, useCallback, useMemo } from 'react';

interface UseEnvironmentVariablesProps {
  commandGroups: Record<string, any[]>;
  activeCommand: string;
}

interface EnvironmentVariablesResult {
  envValues: Record<string, Record<string, string>>;
  envErrors: Record<string, string[]>;
  handleEnvChange: (command: string, key: string, value: string) => void;
  isEnvValid: boolean;
}

export function useEnvironmentVariables({ 
  commandGroups, 
  activeCommand 
}: UseEnvironmentVariablesProps): EnvironmentVariablesResult {
  const [envValues, setEnvValues] = useState<Record<string, Record<string, string>>>({});
  const [envErrors, setEnvErrors] = useState<Record<string, string[]>>({});

  // 🔥 환경변수 값 변경 핸들러
  const handleEnvChange = useCallback((command: string, key: string, value: string) => {
    setEnvValues(prev => ({
      ...prev,
      [command]: {
        ...prev[command],
        [key]: value
      }
    }));

    // 🔥 간단한 유효성 검사 (빈 값만 체크)
    setEnvErrors(prev => {
      const commandErrors = prev[command] || [];
      const newErrors = value.trim() 
        ? commandErrors.filter(err => err !== key)
        : [...commandErrors.filter(err => err !== key), key];

      return {
        ...prev,
        [command]: newErrors
      };
    });
  }, []);

  // 🔥 현재 명령어의 환경변수 유효성 검사
  const isEnvValid = useMemo(() => {
    const currentMethod = commandGroups[activeCommand]?.[0];
    if (!currentMethod?.env) return true;

    const requiredKeys = Object.keys(currentMethod.env);
    const currentValues = envValues[activeCommand] || {};
    
    return requiredKeys.every(key => {
      const value = currentValues[key] || '';
      return value.trim().length > 0;
    });
  }, [commandGroups, activeCommand, envValues]);

  return {
    envValues,
    envErrors,
    handleEnvChange,
    isEnvValid
  };
} 