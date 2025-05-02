import React from 'react';

/**
 * 로컬 스토리지에서 값을 가져옵니다.
 * @param key 로컬 스토리지 키
 * @param defaultValue 기본값 (키가 없거나 에러 발생 시 반환)
 */
export const getFromStorage = (key: string, defaultValue: any) => {
  try {
    const value = localStorage.getItem(key);

    // 값이 없으면 기본값 반환
    if (value === null) return defaultValue;

    // 값이 JSON인지 확인 시도
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // JSON 파싱 실패 시 원래 문자열 반환
        return value;
      }
    }

    // 단순 문자열 값 반환
    return value;
  } catch (e) {
    console.warn(`로컬 스토리지에서 ${key} 가져오기 오류:`, e);
    return defaultValue;
  }
};

/**
 * 로컬 스토리지에 값을 저장합니다.
 * @param key 로컬 스토리지 키
 * @param value 저장할 값 (객체는 자동으로 문자열화)
 */
export const saveToStorage = (key: string, value: any) => {
  try {
    // 객체나 배열이면 JSON으로 변환
    if (typeof value === 'object' && value !== null) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      // 그 외 값은 문자열로 저장
      localStorage.setItem(key, String(value));
    }
  } catch (e) {
    console.warn(`로컬 스토리지에 ${key} 저장 오류:`, e);
  }
};
