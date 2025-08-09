import React, { useEffect, useMemo, useRef, useState } from "react";

/*
Self‑Contained Question Hub (no external hooks)
- Runs in this canvas with mock data + local state only.
- Tabs: My Library / Drafts / Explore Public
- Search, filter (status + difficulty), sort, grid/list views
- Preview modal
- Actions (publish/unpublish, duplicate, delete, clone, edit/start as alerts)
*/

// ----- UI atoms -----
function Badge({ tone = "slate", children }) {
  const map = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-700",
    rose: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[tone]}`}>{children}</span>;
}

function DifficultyBadge({ d }) {
  if (d === "easy") return <Badge tone="green">簡単</Badge>;
  if (d === "medium") return <Badge tone="blue">普通</Badge>;
  if (d === "hard") return <Badge tone="amber">難しい</Badge>;
  if (d === "expert") return <Badge tone="violet">上級</Badge>;
  return <Badge>普通</Badge>;
}

function StatusBadge({ s }) {
  if (s === "published") return <Badge tone="green">公開</Badge>;
  if (s === "draft") return <Badge tone="slate">下書き</Badge>;
  if (s === "creating") return <Badge tone="amber">作成中</Badge>;
  return <Badge>—</Badge>;
}

function Empty({ title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="text-5xl">📭</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ----- Demo Data -----
const initialMySets = [
  {
    id: "SET-01",
    title: "一般常識ミックス",
    description: "日本の一般常識を幅広くチェック",
    status: "published",
    difficulty_level: "medium",
    category: "general",
    is_public: false,
    total_questions: 15,
    times_played: 23,
    updated_at: "2025-08-08T10:00:00Z",
    created_at: "2025-08-01T02:00:00Z",
    preview_images: [
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518082301739-57d212c29923?q=80&w=800&auto=format&fit=crop"
    ],
    play_settings: { countdown: 10, time_bonus: true, streaks: true },
    average_score: 72.4,
    median_correct_rate: 70,
  },
  {
    id: "SET-02",
    title: "英単語クイック",
    description: "高校レベルの英単語をテンポ良く",
    status: "draft",
    difficulty_level: "easy",
    category: "vocab",
    is_public: false,
    total_questions: 10,
    times_played: 5,
    updated_at: "2025-08-07T10:00:00Z",
    created_at: "2025-08-05T02:00:00Z",
    preview_images: [],
    play_settings: { countdown: 7, time_bonus: true, streaks: false },
    average_score: 84.1,
    median_correct_rate: 85,
  },
  {
    id: "SET-03",
    title: "世界地理ベーシック",
    description: "国旗・首都・地形の基礎",
    status: "creating",
    difficulty_level: "medium",
    category: "geography",
    is_public: false,
    total_questions: 6,
    times_played: 0,
    updated_at: "2025-08-08T06:00:00Z",
    created_at: "2025-08-06T02:00:00Z",
    preview_images: [],
    play_settings: { countdown: 12, time_bonus: false, streaks: true },
    average_score: 0,
    median_correct_rate: "—",
  },
];

const initialPublicSets = [
  {
    id: "PUB-11",
    title: "日本史スプリント",
    description: "縄文から現代までサクッと復習",
    status: "published",
    difficulty_level: "hard",
    category: "history",
    is_public: true,
    total_questions: 12,
    times_played: 131,
    updated_at: "2025-08-06T10:00:00Z",
    created_at: "2025-08-03T02:00:00Z",
    preview_images: [
      "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=800&auto=format&fit=crop"
    ],
    play_settings: { countdown: 10, time_bonus: true, streaks: true },
    average_score: 61.2,
    median_correct_rate: 59,
  },
  {
    id: "PUB-12",
    title: "算数ドリル(小5)",
    description: "割合・速さ・単位換算",
    status: "published",
    difficulty_level: "easy",
    category: "math",
    is_public: true,
    total_questions: 15,
    times_played: 310,
    updated_at: "2025-08-01T10:00:00Z",
    created_at: "2025-07-28T02:00:00Z",
    preview_images: [],
    play_settings: { countdown: 8, time_bonus: true, streaks: false },
    average_score: 76.9,
    median_correct_rate: 78,
  },
];

// ----- Controls -----
const DIFFICULTY_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "easy", label: "簡単" },
  { value: "medium", label: "普通" },
  { value: "hard", label: "難しい" },
  { value: "expert", label: "上級" },
];

const STATUS_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "creating", label: "作成中" },
  { value: "published", label: "公開" },
];

const SORT_OPTIONS = [
  { value: "updated_desc", label: "更新が新しい" },
  { value: "created_desc", label: "作成が新しい" },
  { value: "plays_desc", label: "プレイ回数(多い順)" },
  { value: "questions_desc", label: "問題数(多い順)" },
  { value: "title_asc", label: "タイトル(A→Z)" },
];

function Toolbar({ query, setQuery, sort, setSort, filter, setFilter, right, searchRef }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={searchRef}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="検索（タイトル・説明・タグ） / Press / to focus"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              状態: {o.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          value={filter.difficulty}
          onChange={(e) => setFilter((p) => ({ ...p, difficulty: e.target.value }))}
        >
          {DIFFICULTY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              難易度: {o.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              並び替え: {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

function PreviewModal({ open, onClose, item, onClone, onEdit, onStart }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{item?.title || "Untitled"}</h3>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
              <StatusBadge s={item?.status} />
              <DifficultyBadge d={item?.difficulty_level} />
              {item?.is_public ? <Badge tone="blue">🌐 公開</Badge> : <Badge>🔒 非公開</Badge>}
              <span>問題数: {item?.total_questions ?? 0}</span>
              <span>プレイ: {item?.times_played ?? 0}</span>
              {item?.category && <Badge>{item.category}</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        <p className="mt-3 text-sm text-slate-600">{item?.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {(item?.preview_images || []).slice(0, 6).map((src, i) => (
            <div key={i} className="aspect-video overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img src={src} alt="q-preview" className="h-full w-full object-cover" />
            </div>
          ))}
          {(!item?.preview_images || item.preview_images.length === 0) && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              プレビュー画像はありません
            </div>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="font-medium">ゲーム設定 (概要)</div>
            <ul className="mt-2 list-disc pl-5 text-slate-600">
              <li>タイマー: {item?.play_settings?.countdown ?? 10}s</li>
              <li>時間ボーナス: {item?.play_settings?.time_bonus ? "オン" : "オフ"}</li>
              <li>連続正解: {item?.play_settings?.streaks ? "オン" : "オフ"}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm">
            <div className="font-medium">最近の成績</div>
            <ul className="mt-2 list-disc pl-5 text-slate-600">
              <li>平均点: {item?.average_score?.toFixed ? item.average_score.toFixed(1) : (item?.average_score ?? 0)}</li>
              <li>正答率中央値: {item?.median_correct_rate ?? "—"}%</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {item?.is_public && (
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={onClone}>
              ＋ ライブラリへ追加
            </button>
          )}
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={onEdit}>✏️ 編集</button>
          <button className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white" onClick={onStart}>🚀 ゲーム開始</button>
        </div>
      </div>
    </div>
  );
}

function Card({ item, tab, onPreview, onPublishToggle, onDuplicate, onDelete, onEdit, onStart, onClonePublic }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{item.category || "カテゴリー未設定"}</div>
          <h3 className="mt-0.5 line-clamp-1 text-base font-semibold">{item.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <StatusBadge s={item.status} />
            <DifficultyBadge d={item.difficulty_level} />
            {item.is_public ? <Badge tone="blue">🌐 公開</Badge> : <Badge>🔒 非公開</Badge>}
            <span>問題数: {item.total_questions ?? 0}</span>
            <span>プレイ: {item.times_played ?? 0}</span>
          </div>
        </div>
        <button onClick={onPreview} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">👁 プレビュー</button>
      </div>
      {item.description && <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tab === "public" ? (
          <>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => onClonePublic(item)}>＋ ライブラリへ追加</button>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={onPreview}>詳細</button>
          </>
        ) : (
          <>
            {item.status === "published" ? (
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => onPublishToggle(item, "draft")}>
                下書きへ
              </button>
            ) : (
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => onPublishToggle(item, "published")}>
                公開する
              </button>
            )}
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => onDuplicate(item)}>複製</button>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm" onClick={() => onEdit(item)}>編集</button>
            <button className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm text-white" onClick={() => onStart(item)} disabled={!item.total_questions}>ゲーム開始</button>
            <button className="ml-auto rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-sm text-rose-700" onClick={() => onDelete(item)}>削除</button>
          </>
        )}
      </div>
    </div>
  );
}

function RowActions({ item, tab, onPreview, onPublishToggle, onDuplicate, onDelete, onEdit, onStart, onClonePublic }) {
  return (
    <div className="flex items-center justify-end gap-2">
      {tab === "public" ? (
        <>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" onClick={() => onClonePublic(item)}>＋ 追加</button>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" onClick={onPreview}>詳細</button>
        </>
      ) : (
        <>
          {item.status === "published" ? (
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" onClick={() => onPublishToggle(item, "draft")}>下書きへ</button>
          ) : (
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" onClick={() => onPublishToggle(item, "published")}>公開</button>
          )}
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" onClick={() => onDuplicate(item)}>複製</button>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs" onClick={() => onEdit(item)}>編集</button>
          <button className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white" onClick={() => onStart(item)} disabled={!item.total_questions}>開始</button>
          <button className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs text-rose-700" onClick={() => onDelete(item)}>削除</button>
        </>
      )}
    </div>
  );
}

// ----- Main Demo Component -----
export default function QuestionHubDemo() {
  const [tab, setTab] = useState("mine"); // mine | drafts | public
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated_desc");
  const [filter, setFilter] = useState({ status: "", difficulty: "", category: "" });
  const [view, setView] = useState("grid"); // grid | list

  const [mySets, setMySets] = useState(initialMySets);
  const [publicSets, setPublicSets] = useState(initialPublicSets);

  const [preview, setPreview] = useState({ open: false, item: null });

  // focus search with /
  const searchRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => {
    let list = tab === "public" ? publicSets : mySets.filter((s) => (tab === "mine" ? s.status === "published" : s.status !== "published"));

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((x) => [x.title, x.description, x.category].join(" ").toLowerCase().includes(q));
    }
    if (filter.difficulty) list = list.filter((x) => x.difficulty_level === filter.difficulty);
    if (filter.status) list = list.filter((x) => x.status === filter.status);

    const key = (x) => {
      switch (sort) {
        case "created_desc":
          return -new Date(x.created_at).getTime();
        case "plays_desc":
          return -(x.times_played || 0);
        case "questions_desc":
          return -(x.total_questions || 0);
        case "title_asc":
          return String(x.title || "").toLowerCase();
        case "updated_desc":
        default:
          return -new Date(x.updated_at || x.created_at).getTime();
      }
    };
    const sorted = [...list].sort((a, b) => {
      const ak = key(a);
      const bk = key(b);
      if (typeof ak === "string" && typeof bk === "string") return ak.localeCompare(bk);
      return ak - bk;
    });
    return sorted;
  }, [tab, publicSets, mySets, query, sort, filter.difficulty, filter.status]);

  // ----- Action handlers (local state only) -----
  const onPublishToggle = (item, next) => {
    setMySets((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: next, updated_at: new Date().toISOString() } : x)));
  };

  const onDuplicate = (item) => {
    const copy = {
      ...item,
      id: item.id + "-COPY-" + Math.random().toString(36).slice(2, 7),
      title: item.title + " (コピー)",
      status: "draft",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      times_played: 0,
    };
    setMySets((prev) => [copy, ...prev]);
    alert("複製を作成しました。Draftへ追加。");
  };

  const onDelete = (item) => {
    if (!confirm(`"${item.title}" を削除しますか？`)) return;
    setMySets((prev) => prev.filter((x) => x.id !== item.id));
  };

  const onClonePublic = (item) => {
    const clone = {
      ...item,
      id: "CLONE-" + Math.random().toString(36).slice(2, 7),
      is_public: false,
      status: "draft",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      times_played: 0,
    };
    setMySets((prev) => [clone, ...prev]);
    alert("公開セットをライブラリに追加しました (Draft)。");
  };

  const onEdit = (item) => {
    alert(`編集画面へ遷移する想定: ${item.title}`);
  };

  const onStart = (item) => {
    alert(`ゲーム開始フローへ: ${item.title}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-semibold">📚 Question Hub — Demo</h1>
            <p className="text-sm text-slate-500">自分のセット管理と公開セットの探索（デモ）</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={`rounded-xl px-3 py-1.5 text-sm ${tab === "mine" ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`} onClick={() => setTab("mine")}>マイライブラリ</button>
            <button className={`rounded-xl px-3 py-1.5 text-sm ${tab === "drafts" ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`} onClick={() => setTab("drafts")}>下書き</button>
            <button className={`rounded-xl px-3 py-1.5 text-sm ${tab === "public" ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`} onClick={() => setTab("public")}>公開セットを探す</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Toolbar
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          filter={filter}
          setFilter={setFilter}
          searchRef={searchRef}
          right={
            <div className="flex items-center gap-2">
              <button className={`rounded-xl border px-3 py-2 text-sm ${view === "grid" ? "bg-slate-900 text-white" : "bg-white border-slate-200"}`} onClick={() => setView("grid")}>
                Grid
              </button>
              <button className={`rounded-xl border px-3 py-2 text-sm ${view === "list" ? "bg-slate-900 text-white" : "bg-white border-slate-200"}`} onClick={() => setView("list")}>
                List
              </button>
              {tab !== "public" && (
                <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={() => alert("新規作成: エディタへ遷移")}>＋ 新規作成</button>
              )}
            </div>
          }
        />

        {items.length === 0 ? (
          <div className="mt-6">
            <Empty
              title={tab === "public" ? "公開セットが見つかりません" : "クイズセットがありません"}
              desc={tab === "public" ? "検索条件を変更してもう一度お試しください。" : "最初のクイズセットを作成しましょう。"}
              action={tab !== "public" && (
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => alert("新規作成: エディタへ遷移")}>クイズを作成</button>
              )}
            />
          </div>
        ) : view === "grid" ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card
                key={item.id}
                item={item}
                tab={tab}
                onPreview={() => setPreview({ open: true, item })}
                onPublishToggle={onPublishToggle}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onEdit={onEdit}
                onStart={onStart}
                onClonePublic={onClonePublic}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">タイトル</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3">難易度</th>
                  <th className="px-4 py-3">問題数</th>
                  <th className="px-4 py-3">プレイ</th>
                  <th className="px-4 py-3">更新日</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{item.description}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge s={item.status} /></td>
                    <td className="px-4 py-3"><DifficultyBadge d={item.difficulty_level} /></td>
                    <td className="px-4 py-3">{item.total_questions ?? 0}</td>
                    <td className="px-4 py-3">{item.times_played ?? 0}</td>
                    <td className="px-4 py-3">{new Date(item.updated_at || item.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        item={item}
                        tab={tab}
                        onPreview={() => setPreview({ open: true, item })}
                        onPublishToggle={onPublishToggle}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onStart={onStart}
                        onClonePublic={onClonePublic}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PreviewModal
        open={preview.open}
        onClose={() => setPreview({ open: false, item: null })}
        item={preview.item}
        onClone={() => onClonePublic(preview.item)}
        onEdit={() => onEdit(preview.item)}
        onStart={() => onStart(preview.item)}
      />
    </div>
  );
}
