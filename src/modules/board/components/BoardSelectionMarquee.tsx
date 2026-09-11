import React from 'react';

export interface MarqueeBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BoardSelectionMarqueeProps {
  box: MarqueeBox | null;
}

export const BoardSelectionMarquee: React.FC<BoardSelectionMarqueeProps> = ({ box }) => {
  if (!box) return null;

  const width = Math.max(0, box.maxX - box.minX);
  const height = Math.max(0, box.maxY - box.minY);

  if (width < 2 && height < 2) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: box.minX,
        top: box.minY,
        width,
        height,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="border-2 border-dashed border-[#7F95FF] bg-[#7F95FF]/20 dark:bg-[#7F95FF]/25 rounded-[3px] shadow-sm pointer-events-none"
    />
  );
};
