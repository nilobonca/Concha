import React from 'react';
import { Layers, MapPin, Clock, X, ExternalLink, Folder, Music, Circle, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSmoothHorizontalScroll } from '@/hooks/useSmoothHorizontalScroll';

interface DockedMenuProps {
    activeTab: 'layers' | 'pins' | 'history' | 'assets' | 'soundboard' | 'activePlayers' | 'globalTracks';
    onTabChange: (tab: 'layers' | 'pins' | 'history' | 'assets' | 'soundboard' | 'activePlayers' | 'globalTracks') => void;
    onClose: () => void;
    onUndock: (tab: 'layers' | 'pins' | 'history' | 'assets' | 'soundboard' | 'activePlayers' | 'globalTracks') => void;
    dockedItems: Set<'layers' | 'pins' | 'history' | 'assets' | 'soundboard' | 'activePlayers' | 'globalTracks'>;
    children: React.ReactNode;
}

export default function DockedMenu({ activeTab, onTabChange, onClose, onUndock, dockedItems, children }: DockedMenuProps) {
    const tabsContainerRef = useSmoothHorizontalScroll<HTMLDivElement>({ speed: 1.15, easing: 0.16 });
    const tabs: { id: DockedMenuProps['activeTab']; label: string; icon: React.ReactNode; activeColor: string }[] = [
        { id: 'layers', label: 'Camadas', icon: <Layers size={18} />, activeColor: 'text-blue-400' },
        { id: 'pins', label: 'Pins Espaciais', icon: <MapPin size={18} />, activeColor: 'text-amber-400' },
        { id: 'history', label: 'Histórico', icon: <Clock size={18} />, activeColor: 'text-neutral-300' },
        { id: 'assets', label: 'Assets', icon: <Folder size={18} />, activeColor: 'text-[#7F95FF]' },
        { id: 'soundboard', label: 'Soundboard', icon: <Circle size={18} />, activeColor: 'text-emerald-400' },
        { id: 'globalTracks', label: 'Música de Fundo', icon: <Music size={18} />, activeColor: 'text-pink-400' },
        { id: 'activePlayers', label: 'Players Ativos', icon: <Volume2 size={18} />, activeColor: 'text-cyan-400' },
    ];

    return (
        <div className="flex flex-col h-full bg-neutral-900/90 dark:bg-neutral-950/90 backdrop-blur-2xl border-r border-white/10 w-80 shadow-2xl z-50 transition-all duration-300">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between p-2.5 border-b border-white/10 bg-neutral-950/40">
                <div 
                    ref={tabsContainerRef}
                    className="flex gap-1 overflow-x-auto overflow-y-hidden no-scrollbar scrollbar-none py-0.5"
                >
                    {tabs.map((tab) => {
                        if (!dockedItems.has(tab.id)) return null;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`relative p-2 rounded-lg transition-all duration-200 ${
                                    isActive
                                        ? `bg-white/10 ${tab.activeColor} shadow-inner border border-white/10`
                                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                                }`}
                                title={tab.label}
                            >
                                {tab.icon}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute -bottom-1 left-2 right-2 h-0.5 bg-[#1831D7] dark:bg-[#7F95FF] rounded-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 ml-1">
                    <button
                        onClick={() => onUndock(activeTab)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-white/10 rounded-lg transition-colors"
                        title="Desacoplar aba atual"
                    >
                        <ExternalLink size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Fechar"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-hidden relative bg-neutral-900/40">
                {children}
            </div>
        </div>
    );
}
