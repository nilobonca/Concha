'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Square, Type, ChevronUp, ChevronDown, Circle, Triangle, Hexagon, User, Ear, MousePointer2, PenTool, BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/useClickOutside';

interface BottomToolbarProps {
    onDragStart: (e: React.DragEvent, type: string, data?: string) => void;
    tool?: string;
    setTool?: (tool: "area" | "wall" | "pin" | "cursor" | "eraser") => void;
    onOpenVaultSearch?: (category?: 'all' | 'notes' | 'audio' | 'image' | 'canvas') => void;
}

export default function BottomToolbar({ onDragStart, tool, setTool, onOpenVaultSearch }: BottomToolbarProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [showShapeMenu, setShowShapeMenu] = useState(false);
    const [lastUsedShape, setLastUsedShape] = useState('rectangle');
    const [showPinMenu, setShowPinMenu] = useState(false);
    const [lastUsedPin, setLastUsedPin] = useState('pin');
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const shapeMenuRef = useRef<HTMLDivElement>(null);
    const pinMenuRef = useRef<HTMLDivElement>(null);
    const circleDragRef = useRef<HTMLDivElement>(null);
    const triangleDragRef = useRef<HTMLDivElement>(null);
    const hexagonDragRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsTouchDevice(('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
        }
    }, []);

    useClickOutside({
        ref: shapeMenuRef,
        onClose: () => setShowShapeMenu(false),
        enabled: showShapeMenu,
    });

    useClickOutside({
        ref: pinMenuRef,
        onClose: () => setShowPinMenu(false),
        enabled: showPinMenu,
    });

    const handleAreaContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowShapeMenu(true);
        setShowPinMenu(false);
    };

    const handlePinContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowPinMenu(true);
        setShowShapeMenu(false);
    };

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center">
            {/* Hidden Drag Images */}
            <div className="absolute -top-[9999px] left-0 pointer-events-none">
                <div ref={circleDragRef} className="p-2 bg-green-100/50 rounded-full border-2 border-green-500 w-12 h-12 flex items-center justify-center">
                    <Circle size={30} className="text-green-600" />
                </div>
                <div ref={triangleDragRef} className="p-2 bg-green-100/50 rounded-full border-2 border-green-500 w-12 h-12 flex items-center justify-center">
                    <Triangle size={30} className="text-green-600" />
                </div>
                <div ref={hexagonDragRef} className="p-2 bg-green-100/50 rounded-full border-2 border-green-500 w-12 h-12 flex items-center justify-center">
                    <Hexagon size={30} className="text-green-600" />
                </div>
            </div>

            {/* Pin Selection Menu */}
            {showPinMenu && (
                <div
                    ref={pinMenuRef}
                    className="absolute bottom-16 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-lg shadow-xl border border-gray-200/50 dark:border-white/10 p-2 flex gap-2 mb-2 animate-in fade-in zoom-in-95 duration-200"
                >
                    <div
                        draggable
                        onDragStart={(e) => {
                            onDragStart(e, 'pin', 'pin');
                            setLastUsedPin('pin');
                        }}
                        onDragEnd={() => setShowPinMenu(false)}
                        onClick={() => {
                            setLastUsedPin('pin');
                            setShowPinMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded cursor-grab active:cursor-grabbing flex flex-col items-center gap-1"
                        title="Pin Padrão"
                    >
                        <MapPin size={20} className="text-gray-700 dark:text-neutral-200" />
                    </div>
                    <div
                        draggable
                        onDragStart={(e) => {
                            onDragStart(e, 'pin', 'person');
                            setLastUsedPin('person');
                        }}
                        onDragEnd={() => setShowPinMenu(false)}
                        onClick={() => {
                            setLastUsedPin('person');
                            setShowPinMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded cursor-grab active:cursor-grabbing flex flex-col items-center gap-1"
                        title="Pessoa"
                    >
                        <User size={20} className="text-gray-700 dark:text-neutral-200" />
                    </div>
                    <div
                        draggable
                        onDragStart={(e) => {
                            onDragStart(e, 'pin', 'ear');
                            setLastUsedPin('ear');
                        }}
                        onDragEnd={() => setShowPinMenu(false)}
                        onClick={() => {
                            setLastUsedPin('ear');
                            setShowPinMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded cursor-grab active:cursor-grabbing flex flex-col items-center gap-1"
                        title="Ouvido"
                    >
                        <Ear size={20} className="text-gray-700 dark:text-neutral-200" />
                    </div>
                </div>
            )}

            {/* Shape Selection Menu */}
            {showShapeMenu && (
                <div
                    ref={shapeMenuRef}
                    className="absolute bottom-16 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-lg shadow-xl border border-gray-200/50 dark:border-white/10 p-2 flex gap-2 mb-2 animate-in fade-in zoom-in-95 duration-200"
                >
                    <div
                        draggable
                        onDragStart={(e) => {
                            onDragStart(e, 'area', 'rectangle');
                            setLastUsedShape('rectangle');
                        }}
                        onDragEnd={() => setShowShapeMenu(false)}
                        onClick={() => {
                            setLastUsedShape('rectangle');
                            setShowShapeMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded cursor-grab active:cursor-grabbing flex flex-col items-center gap-1"
                        title="Retângulo"
                    >
                        <Square size={20} className="text-gray-700 dark:text-neutral-200" />

                    </div>
                    <div
                        draggable
                        onDragStart={(e) => {
                            onDragStart(e, 'area', 'circle');
                            setLastUsedShape('circle');
                            if (circleDragRef.current) {
                                e.dataTransfer.setDragImage(circleDragRef.current, 32, 32);
                            }
                        }}
                        onDragEnd={() => setShowShapeMenu(false)}
                        onClick={() => {
                            setLastUsedShape('circle');
                            setShowShapeMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded cursor-grab active:cursor-grabbing flex flex-col items-center gap-1"
                        title="Círculo"
                    >
                        <Circle size={20} className="text-gray-700 dark:text-neutral-200" />

                    </div>
                    <div
                        draggable
                        onDragStart={(e) => {
                            onDragStart(e, 'area', 'triangle');
                            setLastUsedShape('triangle');
                            if (triangleDragRef.current) {
                                e.dataTransfer.setDragImage(triangleDragRef.current, 32, 32);
                            }
                        }}
                        onDragEnd={() => setShowShapeMenu(false)}
                        onClick={() => {
                            setLastUsedShape('triangle');
                            setShowShapeMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded cursor-grab active:cursor-grabbing flex flex-col items-center gap-1"
                        title="Triângulo"
                    >
                        <Triangle size={20} className="text-gray-700 dark:text-neutral-200" />

                    </div>
                    <div
                        draggable
                        onDragStart={(e) => {
                            onDragStart(e, 'area', 'hexagon');
                            setLastUsedShape('hexagon');
                            if (hexagonDragRef.current) {
                                e.dataTransfer.setDragImage(hexagonDragRef.current, 32, 32);
                            }
                        }}
                        onDragEnd={() => setShowShapeMenu(false)}
                        onClick={() => {
                            setLastUsedShape('hexagon');
                            setShowShapeMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded cursor-grab active:cursor-grabbing flex flex-col items-center gap-1"
                        title="Hexágono"
                    >
                        <Hexagon size={20} className="text-gray-700 dark:text-neutral-200" />

                    </div>
                </div>
            )}

            {/* Main Toolbar */}
            <div className={cn(
                "bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md rounded-full shadow-2xl border border-gray-200/50 dark:border-white/10 transition-all duration-300 overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                isOpen ? "px-4 py-2" : "px-2 py-2"
            )}>
                {isOpen ? (
                    <div className="flex items-center gap-3.5">
                        
                        {/* Tool: Cursor */}
                        {setTool && (
                            <button
                                onClick={() => setTool('cursor')}
                                className={`p-2 rounded-full transition-colors ${tool === 'cursor' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-100 text-gray-600 dark:text-neutral-400 dark:hover:bg-neutral-800'}`}
                                title="Cursor"
                            >
                                <MousePointer2 size={20} />
                            </button>
                        )}
                        {/* Tool: Wall */}
                        {setTool && (
                            <button
                                onClick={() => setTool(tool === 'wall' ? 'cursor' : 'wall')}
                                className={`p-2 rounded-full transition-colors ${tool === 'wall' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-gray-100 text-gray-600 dark:text-neutral-400 dark:hover:bg-neutral-800'}`}
                                title="Desenhar Parede (Barreira de Som)"
                            >
                                <PenTool size={20} />
                            </button>
                        )}
                        <div className="h-6 w-px bg-gray-300 dark:bg-neutral-700"></div>

                        {/* Pin */}
                        <div
                            draggable
                            onDragStart={(e) => onDragStart(e, 'pin', lastUsedPin)}
                            onContextMenu={handlePinContextMenu}
                            className="group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform relative"
                            title="Arrastar Pin (Botão direito para opções)"
                        >
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                                {lastUsedPin === 'pin' && <MapPin size={20} className="text-blue-600 dark:text-blue-400" />}
                                {lastUsedPin === 'person' && <User size={20} className="text-blue-600 dark:text-blue-400" />}
                                {lastUsedPin === 'ear' && <Ear size={20} className="text-blue-600 dark:text-blue-400" />}
                            </div>

                        </div>

                        {/* Area */}
                        <div
                            draggable
                            onDragStart={(e) => {
                                onDragStart(e, 'area', lastUsedShape);
                                if (lastUsedShape === 'circle' && circleDragRef.current) {
                                    e.dataTransfer.setDragImage(circleDragRef.current, 32, 32);
                                } else if (lastUsedShape === 'triangle' && triangleDragRef.current) {
                                    e.dataTransfer.setDragImage(triangleDragRef.current, 32, 32);
                                } else if (lastUsedShape === 'hexagon' && hexagonDragRef.current) {
                                    e.dataTransfer.setDragImage(hexagonDragRef.current, 32, 32);
                                }
                            }}
                            onContextMenu={handleAreaContextMenu}
                            className="group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform relative"
                            title="Arrastar Área (Botão direito para formas)"
                        >
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                                {lastUsedShape === 'rectangle' && <Square size={20} className="text-green-600 dark:text-green-400" />}
                                {lastUsedShape === 'circle' && <Circle size={20} className="text-green-600 dark:text-green-400" />}
                                {lastUsedShape === 'triangle' && <Triangle size={20} className="text-green-600 dark:text-green-400" />}
                                {lastUsedShape === 'hexagon' && <Hexagon size={20} className="text-green-600 dark:text-green-400" />}
                            </div>

                        </div>

                        {/* Note */}
                        <div
                            draggable={!isTouchDevice}
                            onDragStart={(e) => onDragStart(e, 'note')}
                            onClick={() => onOpenVaultSearch?.('notes')}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                onOpenVaultSearch?.('notes');
                            }}
                            className="group flex flex-col items-center gap-1 cursor-pointer active:cursor-grabbing hover:scale-110 transition-transform"
                            title="Inserir Nota ou Texto (Clique/Toque para buscar ou arraste para o canvas)"
                        >
                            <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800/50 transition-colors">
                                <Type size={20} className="text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>

                        {/* Vault Document Link / Notes Picker */}
                        <div
                            draggable={!isTouchDevice}
                            onDragStart={(e) => onDragStart(e, 'vault-link')}
                            onClick={() => onOpenVaultSearch?.('notes')}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                onOpenVaultSearch?.('notes');
                            }}
                            className="group flex flex-col items-center gap-1 cursor-pointer active:cursor-grabbing hover:scale-110 transition-transform"
                            title="Inserir Nota do Vault (Clique/Toque para escolher ou arraste para o canvas)"
                        >
                            <div className="p-1.5 bg-[#1831D7]/10 dark:bg-[#1831D7]/30 rounded-full group-hover:bg-[#1831D7]/20 dark:group-hover:bg-[#1831D7]/50 transition-colors">
                                <BookOpen size={20} className="text-[#1831D7] dark:text-[#7F95FF]" />
                            </div>
                        </div>

                        {/* Unified Vault Search (Ctrl+K) */}
                        {onOpenVaultSearch && (
                            <button
                                onClick={() => onOpenVaultSearch('all')}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    onOpenVaultSearch('all');
                                }}
                                className="group flex flex-col items-center gap-1 hover:scale-110 transition-transform cursor-pointer"
                                title="Buscar e Adicionar do Vault (Áudios, Imagens, Notas) - Ctrl+K"
                            >
                                <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-full group-hover:bg-cyan-200 dark:group-hover:bg-cyan-800/50 transition-colors">
                                    <Search size={20} className="text-cyan-600 dark:text-cyan-400" />
                                </div>
                            </button>
                        )}

                        <div className="w-px h-8 bg-gray-200 dark:bg-neutral-700 mx-2" />

                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                        >
                            <ChevronDown size={20} className="text-gray-500" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                    >
                        <ChevronUp size={20} className="text-gray-500" />
                    </button>
                )}
            </div>
        </div>
    );
}
