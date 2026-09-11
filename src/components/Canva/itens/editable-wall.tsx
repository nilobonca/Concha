'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCanvas } from '../canva-teste';
import { cn } from '@/lib/utils';
import { useGesture } from '@use-gesture/react';
import { ActiveWall } from '@/interfaces/utils/indexedDB';
import { distanceToPolyline, distanceToSegment } from '@/utils/geometry';
import { handleDeepSelectCycle } from '@/utils/deep-select';

interface EditableWallProps {
    wall: ActiveWall;
    onUpdate: (wall: ActiveWall) => void;
    isSelected?: boolean;
    onSelect?: (e: React.MouseEvent | React.PointerEvent) => void;
    onRightClick?: (e: React.MouseEvent) => void;
    isDrawingMode?: boolean;
    onDrag?: (id: string, totalDx: number, totalDy: number) => void;
    onDragStart?: (id: string) => void;
    isRenaming?: boolean;
    onRenameEnd?: () => void;
    zIndex?: number;
}




interface EditableWallPointProps {
    point: { x: number, y: number };
    index: number;
    wall: ActiveWall;
    isPointDragged: boolean;
    setDraggedPointIndex: (index: number | null) => void;
    setIsDraggingPoint: (isDragging: boolean) => void;
    onUpdate: (wall: ActiveWall) => void;
    isDrawingMode?: boolean;
}

function EditableWallPoint({ point, index, wall, isPointDragged, setDraggedPointIndex, setIsDraggingPoint, onUpdate, isDrawingMode }: EditableWallPointProps) {
    const bindPointGesture = useGesture({
        onDragStart: (state) => {
            state.event.stopPropagation();
            setDraggedPointIndex(index);
            setIsDraggingPoint(true);
        },
        onDrag: (state) => {
            state.event.stopPropagation();
            const { delta: [dx, dy] } = state;

            const newPoints = [...wall.points];
            newPoints[index] = {
                x: newPoints[index].x + dx,
                y: newPoints[index].y + dy
            };

            onUpdate({ ...wall, points: newPoints });
        },
        onDragEnd: () => {
            setDraggedPointIndex(null);
            setIsDraggingPoint(false);
        }
    });

    return (
        <div
            className={cn(
                "absolute w-4 h-4 -ml-2 -mt-2 bg-white border-2 border-red-500 cursor-move rounded-full hover:bg-red-50 hover:scale-125 transition-transform touch-none shadow-sm",
                isPointDragged ? "bg-red-100 scale-125 ring-2 ring-red-400" : ""
            )}
            style={{
                left: point.x,
                top: point.y,
                zIndex: 30,
                pointerEvents: 'auto'
            }}
            {...bindPointGesture()}
            onClick={(e) => {
                e.stopPropagation();
            }}
            onContextMenu={(e) => {
                if (isDrawingMode) return;
                e.stopPropagation();
                e.preventDefault();
                if (wall.points.length > 2) {
                    const newPoints = wall.points.filter((_, i) => i !== index);
                    onUpdate({ ...wall, points: newPoints });
                }
            }}
            onPointerEnter={() => {
                document.body.style.cursor = 'move';
            }}
            onPointerLeave={() => {
                document.body.style.cursor = 'default';
            }}
        />
    );
}

export function EditableWall({
    wall,
    onUpdate,
    isSelected = false,
    onSelect,
    onRightClick,
    onDrag,
    onDragStart,
    isRenaming = false,
    onRenameEnd,
    zIndex = 1,
    isDrawingMode = false,
}: EditableWallProps) {
    const isEditMode = true;

    const [isHovered, setIsHovered] = useState(false);
    const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

    const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
    const [isDraggingPoint, setIsDraggingPoint] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const selectedAtMouseDown = useRef(isSelected);

    const [localName, setLocalName] = useState(wall.name);

    useEffect(() => {
        setLocalName(wall.name);
    }, [wall.name]);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    // Bounding Box
    const xs = wall.points.map(p => p.x);
    const ys = wall.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const bounds = {
        left: minX,
        top: minY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1)
    };

    const isGroupSelected = isSelected && !isEditMode;

    const bindWallGesture = useGesture({
        onDragStart: ({ event }) => {
            if (isEditMode) return;
            if (!isSelected && onSelect) onSelect(event as any);
            if (onDragStart) onDragStart(wall.id);
        },
        onDrag: ({ delta: [dx, dy] }) => {
            if (isEditMode) return;
            if (onDrag) onDrag(wall.id, dx, dy);
        },
    });

    const handlePointerMoveSVG = (e: React.PointerEvent) => {
        if (!isEditMode && !isGroupSelected) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Hover Line logic
        if (isEditMode) {
            let foundLine: number | null = null;
            for (let i = 0; i < wall.points.length - 1; i++) {
                const dist = distanceToSegment({ x: mouseX, y: mouseY }, wall.points[i], wall.points[i + 1]);
                if (dist < 10) {
                    foundLine = i;
                    break;
                }
            }
            setHoveredLineIndex(foundLine);
        }
    };

    const handlePointerDownSVG = (e: React.PointerEvent) => {
        if (hoveredLineIndex !== null && isEditMode && !isDraggingPoint && isSelected) {
            e.stopPropagation();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const newPoints = [...wall.points];
            newPoints.splice(hoveredLineIndex + 1, 0, { x, y });

            onUpdate({ ...wall, points: newPoints });
        }
    };

    const renderPoints = () => {
        if (!isSelected) return null;

        return wall.points.map((point, index) => (
            <EditableWallPoint
                key={`point-${index}`}
                point={point}
                index={index}
                wall={wall}
                isPointDragged={draggedPointIndex === index}
                setDraggedPointIndex={setDraggedPointIndex}
                setIsDraggingPoint={setIsDraggingPoint}
                onUpdate={onUpdate}
                isDrawingMode={isDrawingMode}
            />
        ));
    };

    const color = wall.color || '#444444';
    const opacity = wall.opacity ?? 1.0;
    const strokeColor = color;
    const strokeWidth = 8;
    const pointsString = wall.points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex }}
            ref={containerRef}
        >
            <div
                className="absolute"
                style={{
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                    pointerEvents: isGroupSelected ? 'auto' : 'none',
                    cursor: isGroupSelected ? 'move' : 'default',
                    touchAction: 'none'
                }}
                {...(isGroupSelected ? bindWallGesture() : {})}
            />

            <svg className="w-full h-full overflow-visible pointer-events-none">
                {/* Hitbox polyline */}
                <polyline 
                    className="draggable-item pointer-events-auto"
                    data-item-id={wall.id}
                    points={pointsString} 
                    fill="none" 
                    stroke="transparent" 
                    strokeWidth={30} 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ cursor: isGroupSelected ? 'move' : 'pointer', pointerEvents: 'stroke' }}
                    onClick={e => {
                        e.stopPropagation();
                        const isCtrlPressed = e.ctrlKey || e.metaKey || e.shiftKey;
                        if (selectedAtMouseDown.current) {
                            if (isCtrlPressed) {
                                if (onSelect) onSelect(e);
                            } else {
                                const wasDeepSelected = handleDeepSelectCycle(e.clientX, e.clientY, wall.id, isSelected);
                                if (!wasDeepSelected && onSelect) onSelect(e);
                            }
                        }
                    }}
                    onContextMenu={e => {
                        if (isDrawingMode) return;
                        e.stopPropagation();
                        e.preventDefault();
                        if (!isSelected && onSelect) onSelect(e);
                        if (onRightClick) onRightClick(e);
                    }}
                    onPointerMove={handlePointerMoveSVG}
                    onPointerDown={(e) => {
                        selectedAtMouseDown.current = isSelected;
                        if (!isSelected && onSelect) {
                            onSelect(e);
                        }
                        handlePointerDownSVG(e);
                    }}
                />
                {/* Visible polyline */}
                <polyline 
                    points={pointsString} 
                    fill="none" 
                    stroke={strokeColor} 
                    strokeWidth={strokeWidth} 
                    opacity={opacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                
                {/* Hover Line Highlight */}
                {hoveredLineIndex !== null && isEditMode && (
                    <line
                        x1={wall.points[hoveredLineIndex].x}
                        y1={wall.points[hoveredLineIndex].y}
                        x2={wall.points[hoveredLineIndex + 1].x}
                        y2={wall.points[hoveredLineIndex + 1].y}
                        stroke="red"
                        strokeWidth={4}
                        strokeOpacity={0.8}
                        strokeDasharray="4 4"
                    />
                )}
            </svg>

            {/* Renaming Input */}
            {isRenaming && (
                <div
                    className="absolute"
                    style={{
                        left: Math.max(0, bounds.left + bounds.width / 2),
                        top: Math.max(0, bounds.top - 30),
                        transform: 'translateX(-50%)',
                        zIndex: 40
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={localName}
                        onChange={e => setLocalName(e.target.value)}
                        onBlur={() => {
                            if (localName.trim() !== wall.name) {
                                onUpdate({ ...wall, name: localName.trim() || 'New Wall' });
                            }
                            if (onRenameEnd) onRenameEnd();
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (localName.trim() !== wall.name) {
                                    onUpdate({ ...wall, name: localName.trim() || 'New Wall' });
                                }
                                if (onRenameEnd) onRenameEnd();
                            }
                        }}
                        className="bg-zinc-800 text-white px-2 py-1 rounded border border-zinc-600 outline-none shadow-lg text-sm font-medium"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
            {!isRenaming && wall.name !== 'Wall' && (
                <div
                    className="absolute"
                    style={{
                        left: Math.max(0, bounds.left + bounds.width / 2),
                        top: Math.max(0, bounds.top - 20),
                        transform: 'translateX(-50%)',
                        zIndex: 40,
                        pointerEvents: 'none'
                    }}
                >
                    <div className="bg-black/50 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap shadow border border-white/10 backdrop-blur-sm">
                        {wall.name}
                    </div>
                </div>
            )}

            {renderPoints()}
        </div>
    );
}
