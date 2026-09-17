import * as React from "react"
import { Moon, Sun, Sparkles, Flame, Terminal, Beer, Palette } from "lucide-react"
import { useTheme, Theme } from "@/components/theme-provider"
import { useClickOutside } from "@/hooks/useClickOutside"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [isOpen, setIsOpen] = React.useState(false)
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    useClickOutside({
        ref: dropdownRef,
        onClose: () => setIsOpen(false),
        enabled: isOpen,
    })

    const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
        { id: "dark", label: "Modo Escuro (Midnight)", icon: <Moon className="w-4 h-4 text-[#7F95FF]" /> },
        { id: "light", label: "Modo Claro (Marfim)", icon: <Sun className="w-4 h-4 text-[#1831D7]" /> },
    ]

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white/70 dark:bg-[#17192A]/80 backdrop-blur-md text-xs font-medium text-stone-800 dark:text-[#F4F0E6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-xs"
                title="Alternar Modo Claro / Escuro"
            >
                <Palette className="w-3.5 h-3.5 text-[#7F95FF]" />
                <span className="capitalize hidden sm:inline">
                    {theme === 'light' ? 'Claro' : 'Escuro'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#17192A]/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500 dark:text-[#B4D3F1] font-semibold border-b border-black/5 dark:border-white/10 mb-1">
                        Paleta Oficial Supercanvas
                    </div>
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setTheme(t.id)
                                setIsOpen(false)
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                theme === t.id
                                    ? "bg-[#1831D7]/15 text-[#1831D7] dark:text-[#7F95FF] font-semibold border border-[#7F95FF]/30"
                                    : "text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10"
                            }`}
                        >
                            {t.icon}
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
