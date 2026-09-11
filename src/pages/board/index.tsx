import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { BoardView } from '@/modules/board/components/BoardView';

export default function BoardIndexPage() {
  const router = useRouter();
  const { id } = router.query;
  const boardId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  if (!boardId) {
    return (
      <div className="w-screen h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-4">
        <div className="animate-spin w-8 h-8 border-2 border-neutral-700 border-t-amber-500 rounded-full" />
        <p className="text-sm font-medium">Carregando quadro...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Concha - Quadro</title>
      </Head>
      <BoardView boardId={boardId} />
    </>
  );
}
