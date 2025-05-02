import { useState, useEffect } from 'react';
import { getFromStorage, saveToStorage } from '../../utils/storageUtils';

/**
 * 로컬 스토리지와 연동된 상태를 관리하는 커스텀 훅
 *
 * @param key 로컬 스토리지 키
 * @param initialValue 초기값
 * @returns [값, 값 설정 함수] - useState와 동일한 인터페이스
 */
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  // 초기 상태 설정
  const [storedValue, setStoredValue] = useState<T>(() => {
    return getFromStorage(key, initialValue);
  });

  // 값이 변경될 때마다 로컬 스토리지 업데이트
  useEffect(() => {
    saveToStorage(key, storedValue);
  }, [key, storedValue]);

  // 값 설정 및 로컬 스토리지 업데이트 함수
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 함수가 전달되었을 경우 현재 상태로 함수 호출
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // 상태 업데이트
      setStoredValue(valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
