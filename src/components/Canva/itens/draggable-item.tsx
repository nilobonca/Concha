'use client';

import React, { useState, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { useCanvasStore } from '@/utils/canva-state';
import { useCanvasGlobalStore } from '@/store/canvasStore';
import { useCanvas } from '../canva-teste';
import { cn } from '@/lib/utils';
import { handleDeepSelectCycle } from '@/utils/deep-select';

// State for deep selection cycle
const lastDeepSelect = {
    time: 0,
    items: [] as string[],
    sortedStr: '',
    currentIndex: -1
};

interface DraggableItemProps {
    id: string;
    x: number;
    y: number;
    zIndex?: number;
    isSelected: boolean;
    children: React.ReactNode;
    className?: string;
    onPositionChange?: (id: string, x: number, y: number) => void;
    onDrag?: (id: string, x: number, y: number, dx?: number, dy?: number) => void;

    onDragStart?: (id: string) => void;
    rotation?: number;
    onSelect?: (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
}

export default function DraggableItem({ id, x, y, zIndex, isSelected, children, className, onPositionChange, onDrag, onDragStart, rotation = 0, onSelect }: DraggableItemProps) {
    const { selectItem, bringToFront, setIsDragging } = useCanvasStore();
    const { transform } = useCanvas();

    const [position, setPosition] = useState({ x, y });

    const prevPos = React.useRef({ x, y });
    const selectedAtMouseDown = React.useRef(isSelected);

    // Sync local position with props when not dragging (e.g. on load or external update)
    useEffect(() => {
        setPosition({ x, y });
        prevPos.current = { x, y };
    }, [x, y]);

    const itemRef = React.useRef<HTMLDivElement>(null);

    const bind = useGesture({
        onDragStart: ({ event, cancel }) => {
            if ((event.target as HTMLElement).closest('.prevent-item-drag')) {
                cancel();
                return;
            }
            event.stopPropagation();

            setIsDragging(true);
            selectItem(id);
            bringToFront(id);
            // Ensure prevPos is up to date with current state at start of drag
            prevPos.current = position;

            if (onDragStart) {
                onDragStart(id);
            }
            selectedAtMouseDown.current = isSelected;
            if (onSelect && !isSelected) {
                onSelect(event as any);
            }
        },
        onDrag: ({ offset: [ox, oy], event }) => {
            event.stopPropagation();

            const clampedX = Math.max(0, ox);
            const clampedY = Math.max(0, oy);

            const dx = clampedX - prevPos.current.x;
            const dy = clampedY - prevPos.current.y;

            setPosition({ x: clampedX, y: clampedY });
            prevPos.current = { x: clampedX, y: clampedY };

            if (onDrag) {
                onDrag(id, clampedX, clampedY, dx, dy);
            }
        },
        onDragEnd: ({ event }) => {
            event.stopPropagation();
            setIsDragging(false);
            if (onPositionChange) {
                onPositionChange(id, position.x, position.y);
            }
        },
    }, {
        drag: {
            from: () => [position.x, position.y],
            transform: ([x, y]) => [x / transform.k, y / transform.k],
            pointer: { buttons: 1 },
            filterTaps: true // Crucial: This tells useGesture to differentiate taps from drags and fire onClick!
        }
    });

    return (
        <div
            ref={itemRef}
            {...bind()}
            onPointerDown={() => {
                selectedAtMouseDown.current = isSelected;
            }}
            onClick={(e) => {
                if ((e.target as HTMLElement).closest('.prevent-item-drag')) {
                    return;
                }
                e.stopPropagation();

                const isCtrlPressed = e.ctrlKey || e.metaKey || e.shiftKey;

                if (selectedAtMouseDown.current) {
                    if (isCtrlPressed) {
                        if (onSelect) onSelect(e);
                    } else {
                        const wasDeepSelected = handleDeepSelectCycle(e.clientX, e.clientY, id, isSelected);
                        if (!wasDeepSelected && onSelect) {
                            onSelect(e);
                        }
                    }
                } else {
                    if (onSelect) {
                        onSelect(e);
                    }
                }
            }}
            className={cn(
                "absolute touch-none select-none transition-shadow duration-200 draggable-item prevent-canvas-pan no-drag",
                isSelected ? "z-50" : "",
                className
            )}
            data-item-id={id}
            data-original-zindex={zIndex ?? 'auto'}
            style={{
                left: position.x,
                top: position.y,
                zIndex: isSelected ? 50 : zIndex,
                position: 'absolute',
                transform: `rotate(${rotation}deg)`,
            }}
        >
            <div
                id={`item-${id}`}
                className={cn(
                    "relative",
                    isSelected && "after:absolute after:-inset-1 after:border-2  after:rounded-xl after:shadow-[0_0_15px_rgba(59,130,246,0.5)] after:pointer-events-none"
                )}
            >
                {children}
            </div>
        </div>
    );
}
