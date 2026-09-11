'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getPolygonCentroid, isPointInPolygon, distanceToSegment, getClosestPointOnSegment } from '@/utils/geometry';
import { useCanvas } from '../canva-teste';
import { cn } from '@/lib/utils';
import { useGesture } from '@use-gesture/react';

import { ActiveArea, Audios } from '@/interfaces/utils/indexedDB';
import AudioPlayerList from '@/components/player-list';
import { useCanvasSelection } from '@/hooks/useCanvasSelection';
import { handleDeepSelectCycle } from '@/utils/deep-select';
import { useThemeStore } from '@/store/themeStore';
import { useAudioEditorStore } from '@/store/audioEditorStore';

interface EditableAreaProps {
    area: ActiveArea;
    onUpdate: (area: ActiveArea) => void;

    isSelected?: boolean;
    onSelect?: (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
    onRightClick?: (e: React.MouseEvent) => void;
    isDrawingMode?: boolean;
    isActive?: boolean;
    onHover?: (audioId: number | null) => void;
    onDrag?: (id: string, totalDx: number, totalDy: number) => void;
    onDragStart?: (id: string) => void;
    isRenaming?: boolean;
    onRenameEnd?: () => void;
    zIndex?: number;
    savedAudios?: Audios[];
}


export default function EditableArea({ area, onUpdate, isSelected, onSelect, onRightClick, isDrawingMode, isActive, onHover, onDrag, onDragStart, isRenaming, onRenameEnd, zIndex, savedAudios = [] }: EditableAreaProps) {
    const { transform } = useCanvas();
    const [points, setPoints] = useState(area.points);
    const pointsRef = useRef(area.points);
    const [liveVolumeSource, setLiveVolumeSource] = useState<{ x: number; y: number } | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(area.name);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [ghostPoint, setGhostPoint] = useState<{ x: number; y: number; index: number } | null>(null);
    const selectedAtMouseDown = useRef<boolean | undefined>(false);

    // State for resizing
    const [isResizing, setIsResizing] = useState(false);
    const initialPointsRef = useRef<{ x: number, y: number }[]>([]);
    const initialCentroidRef = useRef<{ x: number, y: number } | null>(null);
    const initialResizeMovementRef = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        setPoints(area.points);
        pointsRef.current = area.points;
        setLiveVolumeSource(null);
    }, [area.points]);

    useEffect(() => {
        if (isRenaming) {
            setIsEditingName(true);
            setTempName(area.name);
        }
    }, [isRenaming, area.name]);

    const handlePointDrag = (index: number, dx: number, dy: number) => {
        setPoints(prevPoints => {
            const newPoints = [...prevPoints];
            newPoints[index] = {
                x: newPoints[index].x + dx,
                y: newPoints[index].y + dy
            };
            pointsRef.current = newPoints;
            // Immediate update for minimap (react state sync via onUpdate -> updateAreaPersisted)
            // Note: This might trigger frequent IDB writes if not debounced upstream, but is necessary for real-time minimap.
            onUpdate({ ...area, points: newPoints });
            return newPoints;
        });
    };

    const handlePointDragEnd = () => {
        const newArea = { ...area, points: pointsRef.current };
        onUpdate(newArea);
    };

    const bindPoly = useGesture({
        onDragStart: ({ event }) => {
            selectedAtMouseDown.current = isSelected;
            if (onDragStart) onDragStart(area.id);
            if (!isSelected && onSelect) {
                onSelect(event as any);
            }
        },
        onDrag: ({ offset: [ox, oy], movement: [mx, my], delta: [dx, dy], event, ctrlKey, metaKey }) => {
            event.stopPropagation();
            const scaledDx = dx / transform.k;
            const scaledDy = dy / transform.k;

            // Check for Resize Mode (Ctrl or Meta key)
            if (isResizing || ((ctrlKey || metaKey) && !isResizing)) {
                if (!isResizing) {
                    // Start Resizing
                    setIsResizing(true);
                    initialPointsRef.current = [...points];
                    initialCentroidRef.current = getPolygonCentroid(points);
                    initialResizeMovementRef.current = { x: mx, y: my };
                }

                if (initialCentroidRef.current && initialPointsRef.current.length > 0 && initialResizeMovementRef.current) {
                    const centroid = initialCentroidRef.current;
                    const startM = initialResizeMovementRef.current;

                    // Calculate accumulated drag since resize started
                    const resizeDx = (mx - startM.x) / transform.k;
                    const resizeDy = (my - startM.y) / transform.k;

                    // Calculate scale factor based on drag distance
                    // Moving right/down increases scale, left/up decreases
                    // Sensitivity: 200px = 100% change (double size) -> 1 + 1 = 2
                    // Let's try 1 + delta / 200
                    const scaleFactor = Math.max(0.1, 1 + (resizeDx + resizeDy) / 200);

                    const newPoints = initialPointsRef.current.map(p => ({
                        x: centroid.x + (p.x - centroid.x) * scaleFactor,
                        y: centroid.y + (p.y - centroid.y) * scaleFactor
                    }));

                    setPoints(newPoints);
                    pointsRef.current = newPoints;

                    // Update volume source if present
                    if (area.volumeSourcePoint && area.volumeMode === 'proximity') {
                        const source = area.volumeSourcePoint;
                        const newSource = {
                            x: centroid.x + (source.x - centroid.x) * scaleFactor,
                            y: centroid.y + (source.y - centroid.y) * scaleFactor
                        };
                        setLiveVolumeSource(newSource);
                    }
                }
                return;
            }

            // Normal Move Logic
            // Use MOVEMENT (mx, my) instead of OFFSET (ox, oy)
            // Movement resets to [0,0] on every drag start, ensuring we only apply relative delta from start of drag.
            // Offset persists across drags (unless manually reset), causing "teleportation" jumps if used here.
            const totalDx = mx / transform.k;
            const totalDy = my / transform.k;

            if (onDrag) {
                onDrag(area.id, totalDx, totalDy);
            }

            setPoints(prev => {
                const newPoints = prev.map(p => ({
                    x: p.x + scaledDx,
                    y: p.y + scaledDy
                }));
                pointsRef.current = newPoints;
                return newPoints;
            });

            if (area.volumeSourcePoint) {
                setLiveVolumeSource(prev => {
                    const currentSource = prev || area.volumeSourcePoint!;
                    return {
                        x: currentSource.x + scaledDx,
                        y: currentSource.y + scaledDy
                    };
                });
            }
        },
        onDragEnd: ({ event, tap }) => {
            event.stopPropagation();

            if (tap) {
                const isCtrlPressed = (event as any).ctrlKey || (event as any).metaKey || (event as any).shiftKey;
                if (selectedAtMouseDown.current) {
                    if (isCtrlPressed) {
                        if (onSelect) onSelect(event as any);
                    } else {
                        const clientX = (event as any).clientX || (event as any).changedTouches?.[0]?.clientX || 0;
                        const clientY = (event as any).clientY || (event as any).changedTouches?.[0]?.clientY || 0;
                        const wasDeepSelected = handleDeepSelectCycle(clientX, clientY, area.id, !!isSelected);
                        if (!wasDeepSelected && onSelect) onSelect(event as any);
                    }
                }
                return;
            }

            if (isResizing) {
                setIsResizing(false);
                initialPointsRef.current = [];
                initialCentroidRef.current = null;
                initialResizeMovementRef.current = null;

                // Commit resize changes
                const updatedArea = { ...area, points: pointsRef.current };
                if (liveVolumeSource) {
                    updatedArea.volumeSourcePoint = liveVolumeSource;
                }
                onUpdate(updatedArea);
                setLiveVolumeSource(null);
                return;
            }

            const updatedArea = { ...area, points: pointsRef.current };
            if (area.volumeSourcePoint) {
                const totalDx = pointsRef.current[0].x - area.points[0].x;
                const totalDy = pointsRef.current[0].y - area.points[0].y;
                updatedArea.volumeSourcePoint = {
                    x: area.volumeSourcePoint.x + totalDx,
                    y: area.volumeSourcePoint.y + totalDy
                };
            }
            onUpdate(updatedArea); // Added missing update
            setLiveVolumeSource(null);
        }
    });

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isDrawingMode) return;
        e.preventDefault();
        e.stopPropagation();

        const clickP = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const threshold = 10 / transform.k;

        let minDist = Infinity;
        let insertIndex = -1;

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const d = distanceToSegment(clickP, p1, p2);

            if (d < minDist) {
                minDist = d;
                insertIndex = i;
            }
        }

        if (minDist < threshold) {
            const p1 = points[insertIndex];
            const p2 = points[(insertIndex + 1) % points.length];
            const newPoint = getClosestPointOnSegment(clickP, p1, p2);

            const newPoints = [...points];
            newPoints.splice(insertIndex + 1, 0, newPoint);

            setPoints(newPoints);
            pointsRef.current = newPoints;
            onUpdate({ ...area, points: newPoints });
        } else {
            onRightClick?.(e);
        }
    };

    const handleVolumeSourceDrag = (dx: number, dy: number) => {
        setLiveVolumeSource(prev => {
            const currentSource = prev || area.volumeSourcePoint || getPolygonCentroid(area.points);
            const newSource = {
                x: currentSource.x + dx,
                y: currentSource.y + dy
            };

            if (isPointInPolygon(newSource, points)) {
                return newSource;
            }
            return currentSource;
        });
    };

    const handleVolumeSourceDragEnd = () => {
        if (liveVolumeSource) {
            onUpdate({ ...area, volumeSourcePoint: liveVolumeSource });
            setLiveVolumeSource(null);
        }
    };


    const handleNameDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Disabled double click editing
    };

    const handleNameSubmit = () => {
        setIsEditingName(false);
        if (tempName !== area.name) {
            onUpdate({ ...area, name: tempName });
        }
        onRenameEnd?.();
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setIsEditingName(false);
            setTempName(area.name);
            onRenameEnd?.();
        }
    };

    const handleMouseEnter = () => {
        onHover?.(area.linkedAudioId || null);
        if (!isEditingName) {
            tooltipTimeoutRef.current = setTimeout(() => {
                setShowTooltip(true);
                // Auto hide after 2 seconds
                setTimeout(() => {
                    setShowTooltip(false);
                }, 2000);
            }, 1000); // 1 second delay
        }
    };

    const handleMouseLeave = () => {
        onHover?.(null);
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
        }
        setShowTooltip(false);
        setGhostPoint(null);
        setTooltipPos(null);
    };

    const handleAreaMouseMove = (e: React.MouseEvent) => {
        if (isEditingName) return;

        // Update tooltip position
        setTooltipPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

        // If hovering over the ghost point itself, don't recalculate/remove it
        if ((e.target as Element).getAttribute('data-type') === 'ghost-point') {
            return;
        }

        const clickP = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const threshold = 15 / transform.k;

        let minDist = Infinity;
        let insertIndex = -1;
        let closestP = { x: 0, y: 0 };

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const d = distanceToSegment(clickP, p1, p2);

            if (d < minDist) {
                minDist = d;
                insertIndex = i;
                closestP = getClosestPointOnSegment(clickP, p1, p2);
            }
        }

        if (minDist < threshold) {
            setGhostPoint({ x: closestP.x, y: closestP.y, index: insertIndex });
        } else {
            setGhostPoint(null);
        }
    };

    const handleGhostPointClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (ghostPoint) {
            const newPoints = [...points];
            newPoints.splice(ghostPoint.index + 1, 0, { x: ghostPoint.x, y: ghostPoint.y });

            setPoints(newPoints);
            pointsRef.current = newPoints;
            onUpdate({ ...area, points: newPoints });
            setGhostPoint(null);
        }
    };

    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
    const volumeSource = liveVolumeSource || area.volumeSourcePoint || (area.volumeMode === 'proximity' ? getPolygonCentroid(area.points) : null);
    const centroid = getPolygonCentroid(points);
    const proximityRadius = area.proximityRadius || 300;

    const baseColor = area.color || '#3b82f6';
    const proximityColor = baseColor;

    const linkedAudio = area.linkedAudioId ? savedAudios?.find(a => a.id === area.linkedAudioId) : null;

    const handleRadiusDrag = (dx: number, dy: number) => {
        // We only care about distance change from center
        // Basic implementation: dx acts as radial increase/decrease
        // Better: calculate new distance from center based on mouse pos
        // But PointHandle provides delta.
        // Let's assume the handle is at (cx + r, cy).
        // Then dx directly adds to radius.
        const newRadius = Math.max(50, proximityRadius + dx);
        onUpdate({ ...area, proximityRadius: newRadius });
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: (zIndex || 0) + (isSelected ? 10 : 0) }}>
            <svg className="w-full h-full overflow-visible pointer-events-none">
                <defs>
                    <clipPath id={`clip-${area.id}`}>
                        <polygon points={pointsString} />
                    </clipPath>
                    {/* Radial gradient for visualization */}
                    <radialGradient id={`grad-${area.id}`}>
                        <stop offset="0%" stopColor={proximityColor} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={proximityColor} stopOpacity="0" />
                    </radialGradient>
                </defs>

                {area.volumeMode === 'proximity' && volumeSource && (
                    <g>
                        {/* Always visible: Visuals INSIDE the area */}
                        <g clipPath={`url(#clip-${area.id})`}>
                            {/* Gradient Fill */}
                            <circle cx={volumeSource.x} cy={volumeSource.y} r={proximityRadius} fill={`url(#grad-${area.id})`} />
                            {/* Clipped Outline */}
                            <circle cx={volumeSource.x} cy={volumeSource.y} r={proximityRadius} fill="none" stroke={proximityColor} strokeWidth="2" strokeDasharray="8 4" strokeOpacity="0.5" />
                        </g>

                        {/* Conditionally visible: Visuals OUTSIDE the area (Full Context) */}
                        {isSelected && (
                            <>
                                {/* Render the full circle outline for reference */}
                                <circle cx={volumeSource.x} cy={volumeSource.y} r={proximityRadius} fill="none" stroke={proximityColor} strokeWidth="1" strokeDasharray="8 4" strokeOpacity="0.3" />

                                {/* Render the concentric guides */}
                                <circle cx={volumeSource.x} cy={volumeSource.y} r={proximityRadius * 0.66} fill="none" stroke={proximityColor} strokeWidth="1" strokeOpacity="0.2" />
                                <circle cx={volumeSource.x} cy={volumeSource.y} r={proximityRadius * 0.33} fill="none" stroke={proximityColor} strokeWidth="1" strokeOpacity="0.1" />
                            </>
                        )}
                    </g>
                )}

                <g
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleAreaMouseMove}
                    style={{ cursor: ghostPoint ? 'none' : 'auto' }}
                >
                    <polygon
                        points={pointsString}
                        data-item-id={area.id}
                        className={cn(
                            "draggable-item",
                            "no-drag",
                            "stroke-2",
                            "hover:opacity-80 pointer-events-auto",
                            ghostPoint ? "cursor-none" : isResizing ? "cursor-nwse-resize" : "cursor-move"
                        )}
                        style={{
                            fill: area.color ? area.color : (isActive || isSelected ? '#22c55e' : '#3b82f6'),
                            fillOpacity: area.volumeMode === 'proximity' ? 0.05 : (area.opacity !== undefined ? area.opacity : (isActive || isSelected ? 0.2 : 0.1)),
                            stroke: isSelected
                                ? '#ffffff'
                                : (area.color ? area.color : '#3b82f6'),
                            strokeOpacity: 1,
                            strokeWidth: isSelected ? 3 : 2,
                        }}
                        id={`area-${area.id}`}
                        {...bindPoly()}
                        onContextMenu={handleContextMenu}
                    />

                    {/* Sound wave ripple animation when area is active */}
                    {isActive && useThemeStore.getState().areaRippleEnabled && (() => {
                        const cx = centroid.x;
                        const cy = centroid.y;
                        // Calculate max radius from centroid to farthest polygon vertex
                        const maxR = Math.max(...points.map(p => Math.hypot(p.x - cx, p.y - cy))) * 1.1;
                        const clipId = `area-clip-${area.id}`;
                        const rippleColor = area.color || '#818cf8';
                        return (
                            <>
                                <defs>
                                    <clipPath id={clipId}>
                                        <polygon points={pointsString} />
                                    </clipPath>
                                </defs>
                                <g clipPath={`url(#${clipId})`}>
                                    {[0, 1, 2].map(i => (
                                        <circle
                                            key={i}
                                            cx={cx}
                                            cy={cy}
                                            r={0}
                                            fill="none"
                                            stroke={rippleColor}
                                            strokeWidth={2 / transform.k}
                                            opacity={0}
                                            style={{
                                                animation: `areaRipple 3s ease-out ${i * 1}s infinite`,
                                                // CSS vars for the animation
                                                ['--ripple-max-r' as any]: `${maxR}px`,
                                            }}
                                        >
                                            <animate
                                                attributeName="r"
                                                from="0"
                                                to={String(maxR)}
                                                dur="3s"
                                                begin={`${i * 1}s`}
                                                repeatCount="indefinite"
                                            />
                                            <animate
                                                attributeName="opacity"
                                                values="0.6;0.3;0"
                                                dur="3s"
                                                begin={`${i * 1}s`}
                                                repeatCount="indefinite"
                                            />
                                            <animate
                                                attributeName="stroke-width"
                                                from={String(3 / transform.k)}
                                                to={String(1 / transform.k)}
                                                dur="3s"
                                                begin={`${i * 1}s`}
                                                repeatCount="indefinite"
                                            />
                                        </circle>
                                    ))}
                                </g>
                            </>
                        );
                    })()}

                    {ghostPoint && (
                        <circle
                            cx={ghostPoint.x}
                            cy={ghostPoint.y}
                            r={6 / transform.k}
                            className="fill-transparent stroke-white stroke-2 cursor-none pointer-events-auto hover:fill-white/50 transition-colors no-drag"
                            onClick={handleGhostPointClick}
                            style={{ strokeDasharray: "4 2" }}
                            data-type="ghost-point"
                        />
                    )}
                </g>

                {isSelected && points.map((point, index) => (
                    <PointHandle
                        key={index}
                        x={point.x}
                        y={point.y}
                        scale={transform.k}
                        onDrag={(dx, dy) => handlePointDrag(index, dx, dy)}
                        onDragEnd={() => handlePointDragEnd()}
                    />
                ))}

                {area.volumeMode === 'proximity' && volumeSource && isSelected && (
                    <>
                        {/* Center Point Handle (Moves the source) */}
                        <PointHandle
                            x={volumeSource.x}
                            y={volumeSource.y}
                            scale={transform.k}
                            onDrag={handleVolumeSourceDrag}
                            onDragEnd={handleVolumeSourceDragEnd}
                            className="stroke-2"
                            style={{ fill: proximityColor, stroke: '#ffffff' }}
                        />
                        {/* Radius Resize Handle (Right edge of circle) */}
                        <PointHandle
                            x={volumeSource.x + proximityRadius}
                            y={volumeSource.y}
                            scale={transform.k}
                            onDrag={handleRadiusDrag}
                            onDragEnd={() => { }}
                            className="fill-white stroke-green-600 cursor-ew-resize"
                        />
                    </>
                )}

                {/* Tooltip following mouse */}
                {showTooltip && tooltipPos && !isEditingName && (
                    <foreignObject
                        x={tooltipPos.x}
                        y={tooltipPos.y - 40}
                        width="200"
                        height="40"
                        className="overflow-visible pointer-events-none"
                    >
                        <div
                            className="px-2 py-1 bg-black/80 text-white text-xs rounded shadow-sm backdrop-blur-[1px] w-max pointer-events-none"
                            style={{ transform: `scale(${1 / transform.k})`, transformOrigin: 'top left' }}
                        >
                            {area.name}
                        </div>
                    </foreignObject>
                )}

                {/* Area Name (Central) */}
                {(area.showName || isEditingName) && (
                    <foreignObject
                        x={centroid.x - 100}
                        y={centroid.y - 15}
                        width="200"
                        height="30"
                        className="overflow-visible pointer-events-none"
                    >
                        <div className="flex justify-center items-center w-full h-full">
                            {isEditingName ? (
                                <input
                                    autoFocus
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    onBlur={handleNameSubmit}
                                    onKeyDown={handleNameKeyDown}
                                    className="bg-white/90 text-black text-sm px-1 rounded border border-blue-500 outline-none pointer-events-auto shadow-sm text-center min-w-[50px]"
                                    style={{ transform: `scale(${1 / transform.k})` }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    onDoubleClick={handleNameDoubleClick}
                                    className={cn(
                                        "text-white text-xs font-medium px-2 py-0.5 rounded pointer-events-auto cursor-text select-none whitespace-nowrap transition-all duration-300",
                                        "bg-black/50 shadow-sm backdrop-blur-[1px]"
                                    )}
                                    style={{ transform: `scale(${1 / transform.k})` }}
                                >
                                    {area.name}
                                </span>
                            )}
                        </div>
                    </foreignObject>
                )}

            </svg>

            {/* Floating Audio Player and Controls */}
            {isSelected && (
                <div
                    className="absolute pointer-events-auto flex flex-col gap-2 items-center no-drag"
                    style={{
                        left: centroid.x - 150,
                        top: centroid.y - 180, // Moved up to accommodate toolbar
                        width: 300,
                        transform: `scale(${1 / transform.k})`,
                        transformOrigin: 'bottom center',
                        zIndex: 100 // Ensure it's on top
                    }}
                >


                    {linkedAudio && (
                        <div className="w-full">
                            <AudioPlayerList
                                playerId={area.id}
                                audio={linkedAudio}
                                onDelete={() => { }} // No-op for delete in this context
                                onDuplicate={() => { }} // No-op for duplicate
                                onEdit={(audio) => useAudioEditorStore.getState().openEditor({ audio })}
                                pitch={area.pitch ?? 1.0}
                                onPitchChange={(newPitch) => onUpdate({ ...area, pitch: newPitch })}
                                volume={area.volume ?? 1.0}
                                onVolumeChange={(newVolume) => onUpdate({ ...area, volume: newVolume })}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface PointHandleProps {
    x: number;
    y: number;
    scale: number;
    onDrag: (dx: number, dy: number) => void;
    onDragEnd: () => void;
    className?: string;
    style?: React.CSSProperties;
}

function PointHandle({ x, y, scale, onDrag, onDragEnd, className, style }: PointHandleProps) {
    const bind = useGesture({
        onDrag: ({ delta: [dx, dy], event }) => {
            event.stopPropagation();
            onDrag(dx / scale, dy / scale);
        },
        onDragEnd: ({ event }) => {
            event.stopPropagation();
            onDragEnd();
        },
        onDragStart: ({ event }) => {
            event.stopPropagation();
        }
    });

    const size = 4.8 / scale;

    return (
        <circle
            cx={x}
            cy={y}
            r={size}
            className={cn("fill-blue-500 stroke-white stroke-2 cursor-pointer pointer-events-auto hover:fill-blue-600 no-drag", className)}
            style={style}
            {...bind()}
        />
    );
}
