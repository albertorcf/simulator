// src/app/page.tsx
"use client";
import { Listbox } from "visual-editor";
import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-6 max-w-2xl mx-auto flex flex-col items-center mt-10"> {/* Aumentei a margem superior e centralizei os itens */}
      <h1 className="text-3xl font-bold mb-8 text-center bg-gray-100 rounded-md py-3 px-6 border border-gray-300 w-full max-w-lg">
        🤖 Bot Binance
      </h1>
      
      <div className="flex flex-col sm:flex-row gap-6 mt-6"> {/* Espaçamento entre os botões e responsividade */}
        <Link href="/teste" legacyBehavior>
          <a className="bg-sky-200 hover:bg-sky-300 font-semibold py-3 px-8 rounded-lg text-lg text-center shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-1">
          📈 Simulações
          </a>
        </Link>
        <Link href="/udf" legacyBehavior>
          <a className="bg-emerald-200 hover:bg-emerald-300 font-semibold py-3 px-8 rounded-lg text-lg text-center shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-1">
            ⚙️ Editor de UDFs
          </a>
        </Link>
      </div>
    </main>
  );
}
