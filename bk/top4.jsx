import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * MVP: 15点 / 右サイドメニュー(普段は閉) / 下タイムライン
 * - メインの点 or メニューの名前クリックで「詳細パネル」を表示
 * - 詳細パネルは Doing 見出しが並び、下にコメント（自分/他人）を表示
 * - タイムラインは「〜さんが〜をしています」を流す
 */

// doing 定義（色だけで派手さを出す）
const DOINGS = [
    { key: "study", label: "勉強", emoji: "📚", color: "#3B82F6" },
    { key: "movie", label: "映画鑑賞", emoji: "🍿", color: "#F97316" },
    { key: "work", label: "仕事", emoji: "💻", color: "#10B981" },
    { key: "game", label: "ゲーム", emoji: "🎮", color: "#EC4899" },
    { key: "clean", label: "お掃除", emoji: "🧹", color: "#A855F7" },
    { key: "think", label: "考え中", emoji: "💭", color: "#F59E0B" },
];

// 白ベースのクリーンなデザイン
const BG_GRADIENT =
    "radial-gradient(1200px 800px at 20% 10%, rgba(59,130,246,0.04), transparent 60%)," +
    "radial-gradient(900px 700px at 90% 20%, rgba(236,72,153,0.03), transparent 55%)," +
    "radial-gradient(900px 700px at 65% 90%, rgba(16,185,129,0.03), transparent 55%)," +
    "linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 55%, #FAFAFA 100%)";

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function buildUsers15() {
    const names = [
        "なお",
        "さくら",
        "けんた",
        "ゆい",
        "たくみ",
        "みお",
        "りり",
        "けんと",
        "まい",
        "あずき",
        "しんじ",
        "あきら",
        "さとし",
        "みほ",
        "れん",
    ];

    // メインエリア想定サイズ（後でリサイズに追従するけど、初期配置用）
    const W = 980;
    const H = 560;

    // 点同士が近すぎないように軽い間引き
    const points = [];
    const minDist = 62;

    const genPoint = () => ({
        x: Math.random() * (W - 120) + 60,
        y: Math.random() * (H - 120) + 60,
    });

    for (let i = 0; i < 15; i++) {
        let p = genPoint();
        let tries = 0;
        while (
            points.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < minDist) &&
            tries < 60
        ) {
            p = genPoint();
            tries++;
        }
        points.push(p);
    }

    return names.slice(0, 15).map((name, idx) => {
        // ユーザーごとに「doing履歴(見出し)」を2つくらい持たせる
        const d1 = pick(DOINGS);
        const d2 = pick(DOINGS.filter((d) => d.key !== d1.key));

        return {
            id: idx + 1,
            name,
            // ふわっとした点の初期位置
            pos: points[idx],
            // 今やってるdoing
            currentDoing: d1.key,
            // “この人の1日”のログ（見出し＋メッセージ）
            logs: [
                {
                    doingKey: d1.key,
                    messages: [
                        { side: "self", text: "この問題むずい！" },
                        { side: "self", text: "とけた〜" },
                        { side: "other", text: "おめでとう！" },
                    ],
                },
                {
                    doingKey: d2.key,
                    messages: [],
                },
            ],
        };
    });
}

function doingInfo(key) {
    return DOINGS.find((d) => d.key === key) ?? DOINGS[0];
}

export default function Top() {
    const plazaRef = useRef(null);

    const [users, setUsers] = useState(() => buildUsers15());
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);

    // タイムラインのイベント（下に流す）
    const [timeline, setTimeline] = useState(() => {
        const initial = users.slice(0, 6).map((u) => ({
            id: `${u.id}-${Date.now()}-${Math.random()}`,
            text: `${u.name}さんが ${doingInfo(u.currentDoing).label} をしています`,
        }));
        return initial;
    });

    const selectedUser = useMemo(
        () => users.find((u) => u.id === selectedUserId) ?? null,
        [users, selectedUserId],
    );

    // クリックで選択（点）
    const onClickDot = (id) => {
        setSelectedUserId(id);
        // メニュー開いてても閉じる（雰囲気）
        setMenuOpen(false);
    };

    // メニューから選択
    const onPickUserFromMenu = (id) => {
        setSelectedUserId(id);
    };

    /**
     * 軽い「賑やかさ」演出：
     * - 2.5秒ごとに誰かの doing が変わる（モック）
     * - それをタイムラインにも流す
     */
    useEffect(() => {
        const t = setInterval(() => {
            setUsers((prev) => {
                const next = [...prev];
                const who = pick(next);
                const newDoing = pick(DOINGS).key;

                // 同じだったらやり直し（軽く）
                if (who.currentDoing === newDoing) return prev;

                const idx = next.findIndex((u) => u.id === who.id);
                const updated = { ...next[idx] };
                updated.currentDoing = newDoing;

                // logsの先頭（最新doing）を追加/更新
                const existing = updated.logs.find(
                    (l) => l.doingKey === newDoing,
                );
                if (!existing) {
                    updated.logs = [
                        {
                            doingKey: newDoing,
                            messages: [{ side: "self", text: "はじめよ〜" }],
                        },
                        ...updated.logs,
                    ].slice(0, 4);
                } else {
                    // 既存見出しを先頭に持ってくる（“二回目以降も同じエリアに見出し”）
                    updated.logs = [
                        existing,
                        ...updated.logs.filter((l) => l !== existing),
                    ];
                }

                next[idx] = updated;

                // タイムラインへ
                setTimeline((tl) => {
                    const text = `${updated.name}さんが ${doingInfo(updated.currentDoing).label} をしています`;
                    const item = {
                        id: `${updated.id}-${Date.now()}-${Math.random()}`,
                        text,
                    };
                    // 長くなりすぎないように
                    return [...tl, item].slice(-20);
                });

                return next;
            });
        }, 2500);

        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * 点をふわっと漂わせる（CSSじゃなくJSで超軽く）
     * - 1秒ごとにちょい揺れ（位置は保存しない想定）
     */
    useEffect(() => {
        const interval = setInterval(() => {
            setUsers((prev) => {
                const el = plazaRef.current;
                if (!el) return prev;

                const rect = el.getBoundingClientRect();
                // padding分の余白
                const minX = 28;
                const minY = 28;
                const maxX = Math.max(minX + 1, rect.width - 28);
                const maxY = Math.max(minY + 1, rect.height - 28);

                return prev.map((u) => {
                    // 選択中はあまり動かさない（見やすさ）
                    const bias = u.id === selectedUserId ? 0.25 : 1.0;
                    const dx = (Math.random() - 0.5) * 18 * bias;
                    const dy = (Math.random() - 0.5) * 18 * bias;

                    return {
                        ...u,
                        pos: {
                            x: clamp(u.pos.x + dx, minX, maxX),
                            y: clamp(u.pos.y + dy, minY, maxY),
                        },
                    };
                });
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedUserId]);

    return (
        <div style={styles.page}>
            <style>{`
		*{ box-sizing:border-box; }
		body{ margin:0; }
		@keyframes floatBG {
		  0% { filter: hue-rotate(0deg); }
		  50% { filter: hue-rotate(18deg); }
		  100% { filter: hue-rotate(0deg); }
		}
		@keyframes marquee {
		  0% { transform: translateX(0); }
		  100% { transform: translateX(-50%); }
		}
	  `}</style>

            {/* Top bar */}
            <div style={styles.topbar}>
                <div style={styles.brand}>
                    <div style={styles.brandTitle}>zatsudan</div>
                    <div style={styles.brandSub}>いるだけ広場（MVP）</div>
                </div>

                <button
                    style={styles.menuBtn}
                    onClick={() => setMenuOpen((v) => !v)}
                >
                    Menu
                </button>
            </div>

            {/* Main */}
            <div style={styles.main}>
                {/* Plaza */}
                <div ref={plazaRef} style={styles.plaza}>
                    {/* 賑やか背景 */}
                    <div style={styles.bgLayer} />

                    {/* dots */}
                    {users.map((u) => {
                        const d = doingInfo(u.currentDoing);
                        const isSelected = u.id === selectedUserId;

                        return (
                            <button
                                key={u.id}
                                onClick={() => onClickDot(u.id)}
                                title={`${u.name} / ${d.label}`}
                                style={{
                                    ...styles.dot,
                                    left: u.pos.x,
                                    top: u.pos.y,
                                    borderColor: isSelected
                                        ? "rgba(0,0,0,0.3)"
                                        : "rgba(0,0,0,0.15)",
                                    boxShadow: isSelected
                                        ? `0 0 0 6px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.15)`
                                        : "0 2px 8px rgba(0,0,0,0.1)",
                                }}
                            >
                                {/* core */}
                                <span
                                    style={{
                                        ...styles.dotCore,
                                        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${d.color} 55%, rgba(0,0,0,0.15) 120%)`,
                                    }}
                                />
                                {/* label */}
                                <span style={styles.dotLabel}>
                                    {d.emoji} {u.name}
                                </span>
                            </button>
                        );
                    })}

                    {/* Selected user panel (upper area) */}
                    {selectedUser && (
                        <div style={styles.detailPanel}>
                            <div style={styles.detailHeader}>
                                <div style={styles.detailName}>
                                    {selectedUser.name}
                                    <span style={styles.detailNow}>
                                        今：
                                        {
                                            doingInfo(selectedUser.currentDoing)
                                                .emoji
                                        }{" "}
                                        {
                                            doingInfo(selectedUser.currentDoing)
                                                .label
                                        }
                                    </span>
                                </div>
                                <button
                                    style={styles.closeBtn}
                                    onClick={() => setSelectedUserId(null)}
                                >
                                    ×
                                </button>
                            </div>

                            {/* logs with headings */}
                            <div style={styles.logs}>
                                {selectedUser.logs.map((log) => {
                                    const di = doingInfo(log.doingKey);
                                    return (
                                        <div
                                            key={log.doingKey}
                                            style={styles.logBlock}
                                        >
                                            <div style={styles.logHeading}>
                                                <span
                                                    style={{ marginRight: 8 }}
                                                >
                                                    {di.emoji}
                                                </span>
                                                <span
                                                    style={{ fontWeight: 800 }}
                                                >
                                                    {di.label}
                                                </span>
                                            </div>

                                            {/* messages */}
                                            <div style={styles.msgList}>
                                                {log.messages.length === 0 ? (
                                                    <div style={styles.msgHint}>
                                                        （まだコメントなし）
                                                    </div>
                                                ) : (
                                                    log.messages.map(
                                                        (m, idx) => (
                                                            <div
                                                                key={idx}
                                                                style={{
                                                                    ...styles.msgRow,
                                                                    justifyContent:
                                                                        m.side ===
                                                                        "other"
                                                                            ? "flex-end"
                                                                            : "flex-start",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        ...styles.msgBubble,
                                                                        background:
                                                                            m.side ===
                                                                            "other"
                                                                                ? "#4A90E2"
                                                                                : "#F0F0F0",
                                                                        borderColor:
                                                                            m.side ===
                                                                            "other"
                                                                                ? "#4A90E2"
                                                                                : "rgba(0,0,0,0.10)",
                                                                        color:
                                                                            m.side ===
                                                                            "other"
                                                                                ? "#FFFFFF"
                                                                                : "#333",
                                                                    }}
                                                                >
                                                                    {m.text}
                                                                    {m.side ===
                                                                        "other" && (
                                                                        <span
                                                                            style={
                                                                                styles.otherTag
                                                                            }
                                                                        >
                                                                            他人
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right drawer (menu) */}
                <div
                    style={{
                        ...styles.drawer,
                        transform: menuOpen
                            ? "translateX(0)"
                            : "translateX(110%)",
                    }}
                >
                    <div style={styles.drawerHeader}>
                        <div style={{ fontWeight: 900 }}>Menu</div>
                        <button
                            style={styles.closeBtn}
                            onClick={() => setMenuOpen(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div style={styles.drawerList}>
                        {users.map((u) => {
                            const d = doingInfo(u.currentDoing);
                            const isSelected = u.id === selectedUserId;

                            return (
                                <button
                                    key={u.id}
                                    onClick={() => onPickUserFromMenu(u.id)}
                                    style={{
                                        ...styles.userRow,
                                        background: isSelected
                                            ? "rgba(255,255,255,0.14)"
                                            : "transparent",
                                    }}
                                >
                                    <span
                                        style={{
                                            ...styles.userDot,
                                            background: d.color,
                                        }}
                                    />
                                    <span style={styles.userName}>
                                        {u.name}
                                    </span>
                                    <span style={styles.userDoing}>
                                        {d.emoji} {d.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom timeline */}
            <div style={styles.timeline}>
                <div style={styles.timelineLabel}>Timeline</div>

                {/* 擬似マルキー：同じ文字列を2回並べて流す */}
                <div style={styles.marqueeWrap}>
                    <div style={styles.marqueeInner}>
                        {[...timeline, ...timeline].map((t, i) => (
                            <span
                                key={`${t.id}-${i}`}
                                style={styles.timelineItem}
                            >
                                {t.text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        background: BG_GRADIENT,
        color: "#333333",
        overflow: "hidden",
    },

    topbar: {
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
    },
    brand: { display: "flex", flexDirection: "column", gap: 2 },
    brandTitle: { fontWeight: 900, letterSpacing: 0.4, fontSize: 18, color: "#333" },
    brandSub: { fontSize: 12, opacity: 0.6, color: "#666" },

    menuBtn: {
        border: "1px solid rgba(0,0,0,0.12)",
        background: "#FFFFFF",
        color: "#333",
        padding: "10px 12px",
        borderRadius: 12,
        cursor: "pointer",
        fontWeight: 800,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },

    main: {
        position: "relative",
        height: "calc(100vh - 64px - 64px)", // topbar + timeline
        padding: 14,
    },

    plaza: {
        position: "relative",
        height: "100%",
        borderRadius: 18,
        border: "1px solid rgba(0,0,0,0.08)",
        overflow: "hidden",
        background: "#FFFFFF",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    },

    bgLayer: {
        position: "absolute",
        inset: 0,
        background:
            "radial-gradient(600px 380px at 20% 30%, rgba(59,130,246,0.05), transparent 60%)," +
            "radial-gradient(520px 360px at 85% 25%, rgba(236,72,153,0.04), transparent 60%)," +
            "radial-gradient(520px 360px at 70% 85%, rgba(16,185,129,0.04), transparent 60%)",
        animation: "floatBG 10s ease-in-out infinite",
        pointerEvents: "none",
    },

    dot: {
        position: "absolute",
        width: 18,
        height: 18,
        transform: "translate(-50%, -50%)",
        borderRadius: 999,
        border: "2px solid rgba(0,0,0,0.15)",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
    },
    dotCore: {
        display: "block",
        width: "100%",
        height: "100%",
        borderRadius: 999,
    },
    dotLabel: {
        position: "absolute",
        left: "50%",
        top: 18,
        transform: "translateX(-50%)",
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(0,0,0,0.10)",
        fontSize: 12,
        whiteSpace: "nowrap",
        backdropFilter: "blur(8px)",
        pointerEvents: "none",
        marginTop: 8,
        color: "#333",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },

    detailPanel: {
        position: "absolute",
        left: 16,
        right: 16,
        top: 16,
        maxWidth: 640,
        borderRadius: 18,
        border: "1px solid rgba(0,0,0,0.10)",
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        padding: 14,
    },
    detailHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 10,
    },
    detailName: {
        fontWeight: 900,
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#333",
    },
    detailNow: {
        fontSize: 12,
        opacity: 0.8,
        fontWeight: 800,
        border: "1px solid rgba(0,0,0,0.12)",
        padding: "6px 10px",
        borderRadius: 999,
        background: "#F5F5F5",
        color: "#333",
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "#FFFFFF",
        color: "#333",
        cursor: "pointer",
        fontSize: 18,
        lineHeight: "32px",
    },

    logs: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxHeight: 360,
        overflow: "auto",
        paddingRight: 6,
    },
    logBlock: {
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.10)",
        background: "#F9F9F9",
        padding: 12,
    },
    logHeading: {
        display: "flex",
        alignItems: "center",
        fontSize: 14,
        marginBottom: 8,
        color: "#333",
        fontWeight: 600,
    },
    msgList: { display: "flex", flexDirection: "column", gap: 8 },
    msgHint: { opacity: 0.5, fontSize: 12, color: "#666" },

    msgRow: {
        display: "flex",
    },
    msgBubble: {
        maxWidth: "78%",
        padding: "8px 10px",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.10)",
        fontSize: 13,
        position: "relative",
    },
    otherTag: {
        marginLeft: 8,
        fontSize: 11,
        opacity: 0.6,
        color: "#666",
    },

    drawer: {
        position: "absolute",
        top: 14,
        right: 14,
        width: 300,
        height: "calc(100% - 28px)",
        borderRadius: 18,
        border: "1px solid rgba(0,0,0,0.10)",
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        transition: "transform 180ms ease",
        overflow: "hidden",
    },
    drawerHeader: {
        height: 54,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px 0 14px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
    },
    drawerList: {
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflow: "auto",
        height: "calc(100% - 54px)",
    },
    userRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 10px",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "transparent",
        color: "#333",
        cursor: "pointer",
        textAlign: "left",
    },
    userDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
        boxShadow: "0 0 0 4px rgba(0,0,0,0.04)",
    },
    userName: { fontWeight: 900, fontSize: 13, flex: "0 0 auto", color: "#333" },
    userDoing: { fontSize: 12, opacity: 0.6, marginLeft: "auto", color: "#666" },

    timeline: {
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 14px",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
    },
    timelineLabel: {
        fontWeight: 900,
        fontSize: 12,
        opacity: 0.85,
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "#FFFFFF",
        flex: "0 0 auto",
        color: "#333",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
    marqueeWrap: {
        position: "relative",
        overflow: "hidden",
        flex: 1,
        height: 40,
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "#FAFAFA",
    },
    marqueeInner: {
        display: "inline-flex",
        alignItems: "center",
        gap: 18,
        whiteSpace: "nowrap",
        padding: "0 18px",
        height: "100%",
        width: "max-content",
        animation: "marquee 24s linear infinite",
    },
    timelineItem: {
        fontSize: 13,
        opacity: 0.75,
        color: "#333",
    },
};
