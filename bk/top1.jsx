// プロトタイプ版：doingベースのTop画面（動き＋一瞬しゃべる追加）
// 目的："いるだけ＋生きてる"感を確認する
// 変更：クリックでモーダルは出さない → サイドバーを開いて対象の情報を出す

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import DoingSidebar from "../Components/DoingSidebar.jsx";
import watchDeco from "../assets/doing/watch.png";
import readDeco from "../assets/doing/read.png";
import workDeco from "../assets/doing/work.png";
import gameDeco from "../assets/doing/game.png";
import thinkDeco from "../assets/doing/think.png";
import boredDeco from "../assets/doing/bored.png";

/* =========================
   doing デコ定義
========================= */
const DOING_DECOR = {
    watch: { src: watchDeco, w: 110, h: 110, dx: -26, dy: -40 },
    read: { src: readDeco, w: 110, h: 110, dx: -26, dy: -40 },
    work: { src: workDeco, w: 110, h: 110, dx: -26, dy: -40 },
    game: { src: gameDeco, w: 110, h: 110, dx: -26, dy: -40 },
    think: { src: thinkDeco, w: 92, h: 56, dx: -23, dy: -36 },
    bored: { src: boredDeco, w: 116, h: 68, dx: -29, dy: -42 },
};

/* =========================
   doing（マスタ）定義
========================= */
const DOINGS = [
    { id: "watch", label: "見てる", loose: true },
    { id: "read", label: "読んでる", loose: false },
    { id: "work", label: "仕事してる", loose: false },
    { id: "bored", label: "ボーっとしてる", loose: true },
    { id: "think", label: "考え事してる", loose: true },
    { id: "game", label: "ゲームしてる", loose: true },
];

const canWander = (doing) => doing === "bored";
const rand = (min, max) => Math.random() * (max - min) + min;
const makeKey = () =>
    crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

/* =========================
   DB風モック
========================= */
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();
const loginUserId = 1; // 仮のログインユーザーID
const mockUsers = [
    { id: 1, name: "なお", avatar: "🙂", doing: "work", x: 22, y: 62 },
    { id: 2, name: "maki", avatar: "🐱", doing: "read", x: 48, y: 35 },
    { id: 3, name: "ken", avatar: "😎", doing: "watch", x: 70, y: 58 },
    { id: 4, name: "yui", avatar: "🦊", doing: "bored", x: 30, y: 30 },
    { id: 5, name: "sora", avatar: "🐶", doing: "think", x: 60, y: 28 },
    { id: 6, name: "riku", avatar: "🥸", doing: "game", x: 80, y: 32 },
    { id: 7, name: "emi", avatar: "🙂", doing: "work", x: 15, y: 40 },
    { id: 8, name: "taro", avatar: "😎", doing: "bored", x: 55, y: 70 },
];

const mockDoingEntries = [
    {
        id: 101,
        user_id: 3,
        doing_id: "watch",
        body: "なんとなく眺めてる",
        created_at: minutesAgo(25),
    },
    {
        id: 102,
        user_id: 1,
        doing_id: "watch",
        body: "BGMだけ流してる",
        created_at: minutesAgo(15),
    },

    {
        id: 201,
        user_id: 2,
        doing_id: "read",
        body: "静かなところがいい",
        created_at: minutesAgo(40),
    },
    {
        id: 202,
        user_id: 5,
        doing_id: "read",
        body: "ページめくる音が好き",
        created_at: minutesAgo(18),
    },

    {
        id: 301,
        user_id: 1,
        doing_id: "work",
        body: "今ちょっと集中してる",
        created_at: minutesAgo(10),
    },
    {
        id: 302,
        user_id: 7,
        doing_id: "work",
        body: "あと30分だけがんばる",
        created_at: minutesAgo(4),
    },

    {
        id: 401,
        user_id: 4,
        doing_id: "bored",
        body: "ぼーっと空見てる",
        created_at: minutesAgo(8),
    },
    {
        id: 402,
        user_id: 8,
        doing_id: "bored",
        body: "時間が溶けていく",
        created_at: minutesAgo(3),
    },

    {
        id: 501,
        user_id: 5,
        doing_id: "think",
        body: "頭の中ぐるぐる",
        created_at: minutesAgo(20),
    },

    {
        id: 601,
        user_id: 6,
        doing_id: "game",
        body: "やっと1面クリア…",
        created_at: minutesAgo(6),
    },
];

/* =========================
   Component
========================= */
export default function TopDoingPrototype() {
    const [users, setUsers] = useState(mockUsers);

    // ✅ クリック対象（表示の中心）
    const [focusedUser, setFocusedUser] = useState(null);

    // ✅ 右サイドバーの開閉（親で管理）
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // しゃべり吹き出し用
    const [speechList, setSpeechList] = useState([]);

    // DB風：doing_entries を state として保持
    const [doingEntries, setDoingEntries] = useState(mockDoingEntries);

    const usersRef = useRef(users);
    useEffect(() => {
        usersRef.current = users;
    }, [users]);

    //ユーザーでコメントを絞る
    const commentsByUser = useMemo(() => {
        const grouped = {};
        for (const e of doingEntries) {
            if (!grouped[e.user_id]) grouped[e.user_id] = [];
            grouped[e.user_id].push({
                id: e.id,
                body: e.body,
                doingId: e.doing_id,
                createdAt: e.created_at,
            });
        }

        for (const key of Object.keys(grouped)) {
            grouped[key].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            );
        }

        return grouped;
    }, [doingEntries]);

    // doingEntries -> commentsByDoing（ビュー変換）
    const commentsByDoing = useMemo(() => {
        const grouped = {};
        for (const e of doingEntries) {
            if (!grouped[e.doing_id]) grouped[e.doing_id] = [];
            grouped[e.doing_id].push({
                id: e.id,
                body: e.body,
                userId: e.user_id,
                createdAt: e.created_at,
            });
        }
        for (const key of Object.keys(grouped)) {
            grouped[key].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            );
        }
        return grouped;
    }, [doingEntries]);

    /* ---- bored の人だけふらふら動く ---- */
    useEffect(() => {
        const t = setInterval(() => {
            setUsers((prev) =>
                prev.map((u) => {
                    if (!canWander(u.doing)) return u;
                    if (Math.random() > 0.25) return u;
                    return {
                        ...u,
                        x: Math.max(5, Math.min(95, u.x + rand(-2, 2))),
                        y: Math.max(15, Math.min(90, u.y + rand(-2, 2))),
                    };
                }),
            );
        }, 3000);
        return () => clearInterval(t);
    }, []);

    /* ---- たまに一瞬しゃべる（全員対象） ---- */
    useEffect(() => {
        const t = setInterval(() => {
            const speakerCount = Math.random() < 0.4 ? 2 : 1;
            const shuffled = [...usersRef.current].sort(
                () => Math.random() - 0.5,
            );

            const next = shuffled.slice(0, speakerCount).map((u) => {
                const latest = (commentsByUser[u.id] ?? []).at(-1);
                return {
                    key: makeKey(),
                    userId: u.id,
                    body: latest?.body ?? "",
                };
            });

            setSpeechList(next);
            setTimeout(() => setSpeechList([]), 3500);
        }, 6000);

        return () => clearInterval(t);
    }, [commentsByDoing]);

    const sidebarTitle = focusedUser
        ? `${DOINGS.find((d) => d.id === focusedUser.doing)?.label} / ${focusedUser.name}`
        : "みんなの doing";

    const sidebarComments = focusedUser
        ? (commentsByUser[focusedUser.id] ?? [])
        : [];

    return (
        <>
            <Head title="zatsudan – doing prototype" />
            <div className="page">
                <div className="container">
                    <div className="headerRow">
                        <div className="brand">
                            <div className="brandTitle">zatsudan</div>
                            <div className="brandSub">いるだけの場所</div>
                        </div>
                    </div>

                    <div className="stageWrap">
                        <div className="stage">
                            {users.map((u) => {
                                const deco = DOING_DECOR[u.doing];

                                return (
                                    <div key={u.id}>
                                        {deco && (
                                            <img
                                                src={deco.src}
                                                alt=""
                                                className="doingDeco"
                                                style={{
                                                    left: `calc(${u.x}% + ${deco.dx}px)`,
                                                    top: `calc(${u.y}% + ${deco.dy}px)`,
                                                    width: deco.w,
                                                    height: deco.h,
                                                }}
                                            />
                                        )}

                                        <button
                                            className="person"
                                            style={{
                                                left: `${u.x}%`,
                                                top: `${u.y}%`,
                                            }}
                                            onClick={() => {
                                                setFocusedUser(u);
                                                setSidebarOpen(true); // ✅ クリックで必ず開く
                                            }}
                                        >
                                            <span style={{ fontSize: 24 }}>
                                                {u.avatar}
                                            </span>
                                        </button>

                                        {speechList
                                            .filter((s) => s.userId === u.id)
                                            .map((s) => (
                                                <div
                                                    key={s.key}
                                                    className="speech"
                                                    style={{
                                                        left: `${u.x}%`,
                                                        top: `${u.y - 5}%`,
                                                    }}
                                                >
                                                    {s.body}
                                                </div>
                                            ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ★ サイドバー（クリックで自動open、対象情報を表示） */}
                <DoingSidebar
                    open={sidebarOpen}
                    onOpenChange={(v) => {
                        setSidebarOpen(v);
                        // 任意：閉じたらフォーカスも外すなら↓
                        // if (!v) setFocusedUser(null);
                    }}
                    title={sidebarTitle}
                    comments={sidebarComments}
                    onSend={(text) => {
                        if (!focusedUser) return;

                        // DB風：doing_entries に INSERT
                        const newEntry = {
                            id: Date.now(),
                            user_id: focusedUser.id, // 今は「見てる人が言った」扱い（自分判定は次ステップ）
                            doing_id: focusedUser.doing,
                            body: text,
                            created_at: new Date().toISOString(),
                        };
                        setDoingEntries((prev) => [...prev, newEntry]);
                    }}
                />
            </div>
        </>
    );
}
