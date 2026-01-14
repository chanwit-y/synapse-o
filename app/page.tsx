"use client";

import { Exo_2 } from "next/font/google";
import MarkdownEditor from "./lib/components/MarkdownEditor";

export default function Home() {
  return (
    <div className="flex h-full justify-center bg-zinc-50 font-sans dark:bg-black p-4">
      <MarkdownEditor />
    </div>
  );
}


