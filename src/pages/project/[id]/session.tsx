import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { SessionChat } from '@/components/Chat/SessionChat';
import { DiceTray } from '@/components/Dice/DiceTray';
import { GuestJoinModal } from '@/components/Session/GuestJoinModal';
import { GuestReconnectingOverlay } from '@/components/Session/GuestReconnectingOverlay';
import { GuestSpectrogramCanvas } from '@/components/Session/GuestSpectrogramCanvas';
import { GuestTopBar } from '@/components/Session/GuestTopBar';
import { GuestVolumeControl } from '@/components/Session/GuestVolumeControl';
import { GuestMinigamesOverlay } from '@/components/Session/GuestMinigamesOverlay';
import { useWebRTCGuestSession } from '@/hooks/useWebRTCGuestSession';
import { useGuestMinigames } from '@/hooks/useGuestMinigames';
import { useGuestAudioSpectrogram } from '@/hooks/useGuestAudioSpectrogram';

export default function ListenerSession() {
    const router = useRouter();
    const { id: projectId } = router.query;

    const [username, setUsername] = useState('');
    const [isDiceTrayOpen, setIsDiceTrayOpen] = useState(false);
    const [chatSoundEnabled, setChatSoundEnabled] = useState(true);
    const chatSoundEnabledRef = useRef(true);

    React.useEffect(() => {
        if (projectId && typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(`rpgsa_guest_session_${projectId}`);
                if (saved) {
                    const data = JSON.parse(saved);
                    if (data?.username) {
                        setUsername(data.username);
                    }
                }
            } catch (e) {}
        }
    }, [projectId]);

    const {
        showSpectrogram,
        setShowSpectrogram,
        guestVolume,
        isMuted,
        handleGuestVolumeChange,
        toggleMute,
        audioElRef,
        canvasRef
    } = useGuestAudioSpectrogram();

    const minigamesRef = useRef<any>(null);

    const handleMinigamePayload = useCallback((type: string, payload: any) => {
        if (minigamesRef.current) {
            minigamesRef.current.handleMinigamePayload(type, payload);
        }
    }, []);

    const {
        listenerId,
        isJoined,
        status,
        reconnectAttempt,
        ping,
        activeCount,
        chatMessages,
        chatClearedAt,
        setChatClearedAt,
        channelRef,
        connectToGM,
        disconnectFromGM,
        updateUsername,
        handleSendMessage
    } = useWebRTCGuestSession({
        projectId,
        username,
        chatSoundEnabledRef,
        onMinigamePayload: handleMinigamePayload,
        audioElRef,
        isMuted,
        guestVolume
    });

    const handleUpdateUsername = useCallback((newName: string) => {
        setUsername(newName);
        updateUsername(newName);
    }, [updateUsername]);

    const minigames = useGuestMinigames({
        channelRef,
        listenerId,
        username,
        handleSendMessage,
        chatSoundEnabledRef
    });

    minigamesRef.current = minigames;

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        connectToGM(false);
    };

    return (
        <div className="h-screen max-h-screen overflow-y-auto overflow-x-hidden bg-neutral-950 text-neutral-100 flex flex-col font-sans relative">
            <Head>
                <title>Concha</title>
                <meta name="description" content="Conecte-se para ouvir áudios espaciais 3D em tempo real do Narrador." />
            </Head>

            {/* Hidden audio element for WebRTC live stream playback */}
            <audio ref={audioElRef} style={{ display: 'none' }} />

            {/* Glowing background gradient elements for dark fantasy design */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1831D7]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#52B1FF]/10 rounded-full blur-[120px] pointer-events-none" />

            {!isJoined ? (
                // 1. Name Input Login Screen
                <GuestJoinModal
                    username={username}
                    setUsername={setUsername}
                    status={status}
                    onJoin={handleJoin}
                />
            ) : (
                // 2. Fully Connected Session View
                <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full relative z-10">
                    {/* Reconnection Overlay */}
                    {status === 'reconnecting' && (
                        <GuestReconnectingOverlay
                            reconnectAttempt={reconnectAttempt}
                            onLeave={disconnectFromGM}
                        />
                    )}

                    {/* Top status bar */}
                    <GuestTopBar
                        username={username}
                        ping={ping}
                        activeCount={activeCount}
                        isDiceTrayOpen={isDiceTrayOpen}
                        onToggleDiceTray={() => setIsDiceTrayOpen(!isDiceTrayOpen)}
                        onLeave={disconnectFromGM}
                        onUpdateUsername={handleUpdateUsername}
                    />

                    {/* Floating Dice Tray */}
                    {isDiceTrayOpen && (
                        <div className="absolute top-20 right-4 z-[60]">
                            <DiceTray 
                                onClose={() => setIsDiceTrayOpen(false)}
                                onRoll={(text, isPrivate) => {
                                    if (!isPrivate) {
                                        handleSendMessage(text, true);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Immersive Center Content */}
                    <div className="flex-1 flex flex-col justify-center items-center py-8">
                        {/* Spectrogram Canvas Section */}
                        <GuestSpectrogramCanvas
                            canvasRef={canvasRef}
                            showSpectrogram={showSpectrogram}
                            setShowSpectrogram={setShowSpectrogram}
                            activeCount={activeCount}
                        />

                        {/* Chat Section */}
                        <div className="w-full mt-6 h-[400px]">
                            <SessionChat
                                messages={chatMessages.filter(m => !chatClearedAt || m.timestamp > chatClearedAt)}
                                currentUserId={username}
                                onSendMessage={handleSendMessage}
                                onClear={() => setChatClearedAt(Date.now())}
                                soundEnabled={chatSoundEnabled}
                                onToggleSound={() => {
                                    const nextState = !chatSoundEnabled;
                                    setChatSoundEnabled(nextState);
                                    chatSoundEnabledRef.current = nextState;
                                }}
                                className="h-full"
                            />
                        </div>
                    </div>

                    <div className="text-[10px] text-neutral-600 text-center pt-4 select-none">
                        ID Ouvinte: {listenerId} • Visual Sound Design Multiplayer Engine v1.0
                    </div>

                    {/* Fixed Floating Volume Control */}
                    <GuestVolumeControl
                        guestVolume={guestVolume}
                        isMuted={isMuted}
                        onVolumeChange={handleGuestVolumeChange}
                        onToggleMute={toggleMute}
                    />

                    {/* Clicker, Coin Flip & Cards Minigames Overlay */}
                    <GuestMinigamesOverlay
                        isClickerActive={minigames.isClickerActive}
                        isFadingOut={minigames.isFadingOut}
                        clickerConfig={minigames.clickerConfig}
                        gameOver={minigames.gameOver}
                        timeLeft={minigames.timeLeft}
                        localClicks={minigames.localClicks}
                        clickEffect={minigames.clickEffect}
                        coinState={minigames.coinState}
                        coinResultFace={minigames.coinResultFace}
                        coinCanInteract={minigames.coinCanInteract}
                        cardState={minigames.cardState}
                        cardPermissions={minigames.cardPermissions}
                        clickerPermissions={minigames.clickerPermissions}
                        cooperativeTotalClicks={minigames.cooperativeTotalClicks}
                        onMinigameClick={minigames.handleMinigameClick}
                        onCoinClick={minigames.handleCoinClick}
                        onCardClick={minigames.handleCardClick}
                        onMinigameProgress={minigames.sendClickProgress}
                    />
                </div>
            )}
        </div>
    );
}

export async function getStaticPaths() {
    const isExport = process.env.NEXT_EXPORT === 'true' || process.env.CAPACITOR_BUILD === 'true';
    return {
        paths: [],
        fallback: isExport ? false : 'blocking',
    };
}

export async function getStaticProps() {
    return {
        props: {},
    };
}

