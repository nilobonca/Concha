import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { BoardView } from '@/modules/board/components/BoardView';

export default function BoardPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return (
      <div className="w-screen h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Carregando...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Concha</title>
      </Head>
      <BoardView boardId={id} />
    </>
  );
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: false,
  };
}

export async function getStaticProps() {
  return {
    props: {},
  };
}

