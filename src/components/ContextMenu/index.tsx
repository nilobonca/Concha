'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface ContextMenuOption {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    subMenu?: ContextMenuOption[];
    searchable?: boolean;
    custom?: React.ReactNode;
}

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    options: ContextMenuOption[];
}

export default function ContextMenu({ x, y, onClose, options }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x, y });
    const [activeSubMenuIndex, setActiveSubMenuIndex] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [openSubMenuToLeft, setOpenSubMenuToLeft] = useState(false);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        if (menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            // Adjust horizontal position if menu would go off-screen
            if (x + menuRect.width > viewportWidth) {
                adjustedX = x - menuRect.width; // Open to the left of the cursor
            }

            // Adjust vertical position if menu would go off-screen
            if (y + menuRect.height > viewportHeight) {
                adjustedY = y - menuRect.height; // Open above the cursor if needed
                // If it goes off top, fallback to viewport bottom
                if (adjustedY < 10) adjustedY = viewportHeight - menuRect.height - 10;
            }

            // Ensure menu doesn't go off the left edge
            if (adjustedX < 10) {
                adjustedX = 10;
            }

            // Determine if submenus need to open to the left
            if (adjustedX + (menuRect.width * 2) > viewportWidth) {
                setOpenSubMenuToLeft(true);
            } else {
                setOpenSubMenuToLeft(false);
            }

            // Ensure menu doesn't go off the top edge
            if (adjustedY < 10) {
                adjustedY = 10;
            }

            setPosition({ x: adjustedX, y: adjustedY });
        }
    }, [x, y]);

    useClickOutside({
        ref: menuRef,
        onClose,
        enabled: true,
    });

    // Reset search when submenu changes
    useEffect(() => {
        setSearchTerm('');
        setHighlightedIndex(0);
    }, [activeSubMenuIndex]);

    useEffect(() => {
        setHighlightedIndex(0);
    }, [searchTerm]);

    useEffect(() => {
        if (itemRefs.current[highlightedIndex]) {
            itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [highlightedIndex]);

    // Use a portal to render the menu at the document root level
    if (typeof document === 'undefined') return null;

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className="fixed bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-lg border border-white/40 dark:border-white/10 py-1.5 min-w-[200px] z-[9999] animate-in fade-in zoom-in-95 duration-100"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            {options.map((option, index) => (
                <div
                    key={index}
                    className="relative"
                    onMouseEnter={() => setActiveSubMenuIndex(index)}
                    onMouseLeave={() => setActiveSubMenuIndex(null)}
                >
                    {option.custom ? (
                        <div className="w-full px-4 py-2 text-sm md:text-base cursor-default" onClick={(e) => e.stopPropagation()}>
                            {option.custom}
                        </div>
                    ) : (
                        <button
                            disabled={option.disabled}
                            onClick={() => {
                                if (option.disabled) return;
                                if (option.subMenu) return; // Don't close on submenu click
                                option.onClick();
                                onClose();
                            }}
                            className={`w-full text-left px-3 py-2.5 mx-1 transition-all duration-200 flex items-center justify-between text-sm rounded-lg touch-manipulation relative group
                        ${option.disabled
                                    ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'
                                    : 'hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98] text-gray-700 dark:text-neutral-200 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            style={{ width: 'calc(100% - 8px)' }}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                {option.icon && <span className="text-lg md:text-base flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors">{option.icon}</span>}
                                <span className="font-normal tracking-wide">{option.label}</span>
                            </div>
                            {option.subMenu && <ChevronRight size={16} />}
                        </button>
                    )}

                    {/* Submenu */}
                    {option.subMenu && activeSubMenuIndex === index && (
                        <div
                            className={`absolute top-0 ${openSubMenuToLeft ? 'right-full mr-2' : 'left-full ml-2'} bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-lg border border-white/40 dark:border-white/10 py-1.5 min-w-[200px] max-h-[300px] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150`}
                        >
                            {option.searchable && (
                                <div className="p-2 sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-10 border-b border-gray-200/50 dark:border-white/10">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => {
                                                const filteredOptions = option.subMenu!.filter(subOption =>
                                                    !option.searchable ||
                                                    subOption.label.toLowerCase().includes(searchTerm.toLowerCase())
                                                );
                                                if (filteredOptions.length === 0) return;

                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const selected = filteredOptions[highlightedIndex];
                                                    if (selected && !selected.disabled) {
                                                        selected.onClick();
                                                        onClose();
                                                    }
                                                }
                                            }}
                                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-black/5 dark:bg-white/5 rounded-md border border-transparent focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-gray-900 dark:text-gray-100 transition-all outline-none"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            {option.subMenu
                                .filter(subOption =>
                                    !option.searchable ||
                                    subOption.label.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map((subOption, subIndex) => (
                                    <div key={subIndex} className="relative">
                                        {subOption.custom ? (
                                            <div className="w-full px-4 py-2 text-sm md:text-base cursor-default" onClick={(e) => e.stopPropagation()}>
                                                {subOption.custom}
                                            </div>
                                        ) : (
                                            <button
                                                ref={el => { itemRefs.current[subIndex] = el; }}
                                                disabled={subOption.disabled}
                                                onMouseEnter={() => setHighlightedIndex(subIndex)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (subOption.disabled) return;
                                                    subOption.onClick();
                                                    onClose();
                                                }}
                                                className={`w-full text-left px-3 py-2.5 mx-1 transition-all duration-200 flex items-center gap-3 text-sm rounded-lg touch-manipulation shrink-0 relative group
                                            ${subOption.disabled
                                                        ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500'
                                                        : highlightedIndex === subIndex
                                                            ? 'bg-black/10 dark:bg-white/20 text-gray-900 dark:text-white scale-[0.98]'
                                                            : 'hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98] text-gray-700 dark:text-neutral-200 hover:text-gray-900 dark:hover:text-white'
                                                    }`}
                                                style={{ width: 'calc(100% - 8px)' }}
                                            >
                                                {subOption.icon && <span className="text-lg md:text-base flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors">{subOption.icon}</span>}
                                                <span className="font-normal tracking-wide truncate relative z-10">{subOption.label}</span>
                                            </button>
                                        )}
                                    </div>
                                ))}

                            {option.searchable && option.subMenu.filter(subOption => subOption.label.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                    Nenhum resultado
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>,
        document.body
    );
}


