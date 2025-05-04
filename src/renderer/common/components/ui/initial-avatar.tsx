// src/renderer/common/components/ui/initial-avatar.tsx

import { cn } from "@/renderer/lib/utils"; // cn 유틸리티 import (경로는 실제 프로젝트 구조에 맞게 조정)

interface InitialAvatarProps {
  initials?: string | null;
  colorString?: string | null; // e.g., "purple.500"
  className?: string;
  size?: number; // Optional size in pixels
}

// Helper function to parse color string and generate Tailwind class
// Returns default gray if parsing fails
const getColorClass = (colorString: string | null | undefined): string => {
  if (!colorString || !colorString.includes('.')) {
    return 'bg-gray-400'; // Default color
  }
  try {
    const [colorName, shade] = colorString.split('.');
    // Basic validation (can be expanded)
    if (!colorName || !shade || !/^\d+$/.test(shade)) {
      return 'bg-gray-400';
    }
    // Construct Tailwind class (ensure your Tailwind config includes these colors)
    return `bg-${colorName}-${shade}`;
  } catch (error) {
    console.error("Failed to parse color string:", colorString, error);
    return 'bg-gray-400'; // Default on error
  }
};

export function InitialAvatar({
  initials,
  colorString,
  className,
  size = 40, // Default size 40px (w-10 h-10)
}: InitialAvatarProps) {
  const bgColorClass = getColorClass(colorString);
  const displayInitials = initials?.slice(0, 2) ?? '?'; // Max 2 initials, fallback '?'

  // Dynamic size requires inline styles for width/height
  const sizeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.4}px`, // Adjust font size based on avatar size
    lineHeight: `${size}px`, // Center vertically
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center text-white font-semibold select-none",
        bgColorClass, // Apply dynamic background color class
        className
      )}
      style={sizeStyle}
      title={initials ?? "Avatar"} // Tooltip with full initials if available
    >
      {displayInitials}
    </div>
  );
}