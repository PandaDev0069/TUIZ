import React, { useMemo, useState } from "react";

/*
Kahoot‑style Host Dashboard (No ads/recs) — Self‑Contained Demo
----------------------------------------------------------------
- Home landing for hosts: quick create, resume drafts, recent sets, discover public.
- Clean, sponsor‑free UI. Tailwind only. No external hooks.
- You can wire buttons to real routes later.
*/

function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Badge({ tone = "slate", children }) {
  const map = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[tone]}`}>{children}</span>;
}

function QuizCard({ q, onOpen }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500">{q.category || "Uncategorized"}</div>
          <h3 className="text-base font-semibold leading-tight line-clamp-1">{q.title}</h3>
          <p className="mt-1 text-sm text-slate-600 line-clamp-2">{q.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge tone="blue">{q.difficulty}</Badge>
            <Badge tone="green">{q.questions} 問</Badge>
            <span>プレイ {q.plays}</span>
          </div>
        </div>
        <button onClick={() => onOpen(q)} className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">⋯</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => onOpen({ ...q, action: "edit" })}>✏️ 編集</button>
        <button className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white" onClick={() => onOpen({ ...q, action: "start" })}>🚀 ゲーム開始</button>
      </div>
    </div>
  );
}

function HorizontalScroller({ items, render }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max pr-2">
        {items.map((it, i) => (
          <div key={i} className="w-72 shrink-0">{render(it)}</div>
        ))}
      </div>
    </div>
  );
}

export default function HostHomeDashboardDemo() {
  const [query, setQuery] = useState("");

  // --- Mock Data ---
  const drafts = [
    { id: "D-1", title: "世界地理ベーシック", description: "国旗・首都・地形の基礎。", difficulty: "medium", questions: 8, plays: 0, category: "Geography", updated: "2025-08-08" },
    { id: "D-2", title: "英単語クイック", description: "高校レベルの英単語。", difficulty: "easy", questions: 10, plays: 2, category: "Language", updated: "2025-08-07" },
  ];

  const recents = [
    { id: "R-1", title: "一般常識ミックス", description: "幅広いトピックの常識問題。", difficulty: "medium", questions: 15, plays: 23, category: "General", updated: "2025-08-08" },
    { id: "R-2", title: "算数ドリル(小5)", description: "割合・速さ・単位換算。", difficulty: "easy", questions: 12, plays: 31, category: "Math", updated: "2025-08-06" },
    { id: "R-3", title: "日本史スプリント", description: "縄文から現代まで。", difficulty: "hard", questions: 14, plays: 12, category: "History", updated: "2025-08-05" },
  ];

  const publicSets = [
    { id: "P-1", title: "世界の国旗ライト", description: "入門編の国旗クイズ。", difficulty: "easy", questions: 10, plays: 120, category: "Geography" },
    { id: "P-2", title: "IT基礎チェック", description: "用語と概念の基礎。", difficulty: "medium", questions: 12, plays: 78, category: "IT" },
    { id: "P-3", title: "理科ミックス", description: "物理/化学/生物の入門。", difficulty: "medium", questions: 15, plays: 54, category: "Science" },
  ];

  const filteredRecents = useMemo(() => {
    if (!query.trim()) return recents;
    const q = query.toLowerCase();
    return recents.filter((x) => [x.title, x.description, x.category].join(" ").toLowerCase().includes(q));
  }, [query]);

  function openAction(info) {
    const base = `${info.title}`;
    if (info.action === "edit") alert(`${base} を編集へ`);
    else if (info.action === "start") alert(`${base} のゲーム開始へ`);
    else alert(base);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top hero */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">🎛️ ダッシュボード</h1>
            <p className="text-sm text-slate-500">クイズの作成・管理・開始をすばやく</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => alert("新規クイズへ")}>＋ 新規クイズ</button>
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm" onClick={() => alert("CSV/画像からインポート")}>⤴︎ インポート</button>
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm" onClick={() => alert("空のライブを開始 → セット選択")}>🚀 ライブ開始</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-8">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="公開セット" value={5} sub="あなたの公開中" />
          <Kpi label="下書き" value={2} sub="続きから編集" />
          <Kpi label="累計プレイ" value={66} sub="直近30日: 19" />
          <Kpi label="平均正答率" value="72%" sub="全セッション" />
        </section>

        {/* Quick search + actions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="マイセットを検索（タイトル・説明・カテゴリ） / Press / to focus"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={() => alert("テンプレートから作成")}>📄 テンプレート</button>
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={() => alert("クイズハブへ移動")}>📚 クイズハブ</button>
            </div>
          </div>
        </section>

        {/* Resume drafts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">下書きを続ける</h2>
            <button className="text-sm text-slate-600 hover:underline" onClick={() => alert("すべての下書きを表示")}>すべて表示</button>
          </div>
          <HorizontalScroller
            items={drafts}
            render={(q) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">最終更新 {q.updated}</div>
                <h3 className="mt-1 text-base font-semibold line-clamp-1">{q.title}</h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{q.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Badge tone="blue">{q.difficulty}</Badge>
                  <Badge tone="green">{q.questions} 問</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => openAction({ ...q, action: "edit" })}>✏️ 続きを編集</button>
                  <button className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white" onClick={() => openAction({ ...q, action: "start" })}>🚀 すぐ開始</button>
                </div>
              </div>
            )}
          />
        </section>

        {/* Recent sets */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">最近使ったセット</h2>
            <button className="text-sm text-slate-600 hover:underline" onClick={() => alert("マイライブラリへ")}>マイライブラリへ</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecents.map((q) => (
              <QuizCard key={q.id} q={q} onOpen={openAction} />
            ))}
          </div>
        </section>

        {/* Discover (Public) — simple row without ads */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">公開セットを見つける</h2>
            <button className="text-sm text-slate-600 hover:underline" onClick={() => alert("公開カタログへ")}>もっと見る</button>
          </div>
          <HorizontalScroller
            items={publicSets}
            render={(q) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">{q.category}</div>
                <h3 className="mt-1 text-base font-semibold line-clamp-1">{q.title}</h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{q.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Badge tone="blue">{q.difficulty}</Badge>
                  <Badge tone="green">{q.questions} 問</Badge>
                  <span>プレイ {q.plays}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => alert("詳細/プレビュー")}>👁 プレビュー</button>
                  <button className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white" onClick={() => alert("ライブラリに追加 → 下書きで開く")}>＋ ライブラリへ</button>
                </div>
              </div>
            )}
          />
        </section>
      </main>
    </div>
  );
}
