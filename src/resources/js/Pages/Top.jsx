import React, { useEffect, useMemo, useRef, useState } from "react";
import { styles } from "./Top.styles";
import "./Top.css";

/**
 * MVP: 15点 / 右サイドメニュー(普段は閉) / 下タイムライン
 * DB設計っぽい「テーブル構造（mock）」から状態を合成して描画する版
 *
 * 追加:
 * - 自分（currentUserId）の doing 切り替え
 * - 自分の最新 doing へコメント投稿
 * - 他人の「今の doing」にもコメント投稿（author_user_id で誰が書いたか管理）
 */

const CURRENT_USER_ID = 1; // なお

// =========================
// Mock "DB tables"
// =========================
const DOINGS = [
    { key: "study", label: "勉強", emoji: "📚", color: "#3B82F6" },
    { key: "movie", label: "映画鑑賞", emoji: "🍿", color: "#F97316" },
    { key: "work", label: "仕事", emoji: "💻", color: "#10B981" },
    { key: "game", label: "ゲーム", emoji: "🎮", color: "#EC4899" },
    { key: "clean", label: "お掃除", emoji: "🧹", color: "#A855F7" },
    { key: "think", label: "考え中", emoji: "💭", color: "#F59E0B" },
];

const USERS = [
    { id: 1, name: "なお" },
    { id: 2, name: "さくら" },
    { id: 3, name: "けんた" },
    { id: 4, name: "ゆい" },
    { id: 5, name: "たくみ" },
    { id: 6, name: "みお" },
    { id: 7, name: "りり" },
    { id: 8, name: "けんと" },
    { id: 9, name: "まい" },
    { id: 10, name: "あずき" },
    { id: 11, name: "しんじ" },
    { id: 12, name: "あきら" },
    { id: 13, name: "さとし" },
    { id: 14, name: "みほ" },
    { id: 15, name: "れん" },
];

// =========================
// Utils
// =========================

/** 配列からランダムに1件取る */
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** 数値を min〜max に収める */
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

/** doing key から表示用情報（絵文字・色・ラベル）を引く */
function doingInfo(key) {
    return DOINGS.find((d) => d.key === key) ?? DOINGS[0];
}

/**
 * started_at (timestamp) から
 * 「どれくらい前から doing してるか」を表示用文字列にする
 */
/**
 * started_at (timestamp) から
 * 「HH:MM から〜」形式の表示文字列を作る
 * 例: 14:32 から〜
 */
function formatDoingStartTime(startedAt) {
    if (!startedAt) return "";

    const d = new Date(startedAt);

    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return `${hh}:${mm} から〜`;
}

// =========================
// Mock data builders
// =========================

/**
 * 点の初期配置（重なりにくく）
 * avatar_states テーブル相当を作る
 */
function buildInitialAvatarStates(userIds) {
    const W = 980;
    const H = 560;
    const minDist = 62;

    const points = [];
    const genPoint = () => ({
        x: Math.random() * (W - 120) + 60,
        y: Math.random() * (H - 120) + 60,
    });

    for (let i = 0; i < userIds.length; i++) {
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

    return userIds.map((userId, idx) => ({
        user_id: userId,
        x: points[idx].x,
        y: points[idx].y,
    }));
}

/**
 * 初期の user_doings / doing_messages を作る
 * - doing_messages は author_user_id を持ち、誰が書いたか分かるようにする
 */
function buildInitialUserDoingsAndMessages() {
    const now = Date.now();
    const user_doings = [];
    const doing_messages = [];

    USERS.forEach((u, i) => {
        const d1 = pick(DOINGS);
        const d2 = pick(DOINGS.filter((d) => d.key !== d1.key));

        const ud1 = {
            id: `ud-${u.id}-a`,
            user_id: u.id,
            doing_key: d1.key,
            started_at: now - (i + 1) * 1000 * 30,
        };
        user_doings.push(ud1);

        const ud2 = {
            id: `ud-${u.id}-b`,
            user_id: u.id,
            doing_key: d2.key,
            started_at: now - (i + 1) * 1000 * 60 * 20,
        };
        user_doings.push(ud2);

        // 本人コメント + 他人コメント（例として「さくら」を混ぜる）
        doing_messages.push(
            {
                id: `m-${ud1.id}-1`,
                user_doing_id: ud1.id,
                author_user_id: u.id,
                text: "この問題むずい！",
                created_at: now - 1000 * 10,
            },
            {
                id: `m-${ud1.id}-2`,
                user_doing_id: ud1.id,
                author_user_id: u.id,
                text: "とけた〜",
                created_at: now - 1000 * 6,
            },
            {
                id: `m-${ud1.id}-3`,
                user_doing_id: ud1.id,
                author_user_id: 2, // さくらが書いた想定
                text: "おめでとう！",
                created_at: now - 1000 * 2,
            },
        );
    });

    return { user_doings, doing_messages };
}

// =========================
// Selectors
// =========================

/** user_doings から、そのユーザーの「最新 doing（=今）」を取る */
function getCurrentUserDoing(userId, userDoings) {
    let best = null;
    for (const ud of userDoings) {
        if (ud.user_id !== userId) continue;
        if (!best || ud.started_at > best.started_at) best = ud;
    }
    return best;
}

/** そのユーザーの「今の doing_key」を取る（無ければ先頭） */
function getCurrentDoingKey(userId, userDoings) {
    return getCurrentUserDoing(userId, userDoings)?.doing_key ?? DOINGS[0].key;
}

export default function Top() {
    const plazaRef = useRef(null);

    // ---- mock DB state ----
    const [dbUsers] = useState(() => USERS);
    const [dbDoings] = useState(() => DOINGS);

    const [
        { user_doings: initialUserDoings, doing_messages: initialMessages },
    ] = useState(() => buildInitialUserDoingsAndMessages());

    const [userDoings, setUserDoings] = useState(() => initialUserDoings);
    const [doingMessages, setDoingMessages] = useState(() => initialMessages);
    const [avatarStates, setAvatarStates] = useState(() =>
        buildInitialAvatarStates(USERS.map((u) => u.id)),
    );

    // UI state
    const [selectedUserId, setSelectedUserId] = useState(null);

    // コメント入力（自分 / 他人）
    const [myComment, setMyComment] = useState("");
    const [otherComment, setOtherComment] = useState("");

    // 自分ユーザー（表示用）
    const currentUser = useMemo(
        () =>
            dbUsers.find((u) => u.id === CURRENT_USER_ID) ?? {
                id: CURRENT_USER_ID,
                name: "me",
            },
        [dbUsers],
    );

    // timeline
    const [timeline, setTimeline] = useState(() => {
        const initial = dbUsers.slice(0, 6).map((u) => {
            const currentDoingKey = getCurrentDoingKey(u.id, initialUserDoings);
            return {
                id: `${u.id}-${Date.now()}-${Math.random()}`,
                text: `${u.name}さんが ${doingInfo(currentDoingKey).label} をしています`,
            };
        });
        return initial;
    });

    // -------------------------
    // DB join: users view
    // -------------------------

    /** users + user_doings(最新) + avatar_states を合成して点表示用のビューを作る */
    const usersView = useMemo(() => {
        const latestByUser = new Map();
        for (const ud of userDoings) {
            const prev = latestByUser.get(ud.user_id);
            if (!prev || ud.started_at > prev.started_at)
                latestByUser.set(ud.user_id, ud);
        }

        const posByUser = new Map(avatarStates.map((a) => [a.user_id, a]));

        return dbUsers.map((u) => {
            const current = latestByUser.get(u.id);
            const pos = posByUser.get(u.id);
            return {
                id: u.id,
                name: u.name,
                currentDoing: current?.doing_key ?? dbDoings[0].key,
                pos: pos ? { x: pos.x, y: pos.y } : { x: 100, y: 100 },
            };
        });
    }, [dbUsers, dbDoings, userDoings, avatarStates]);

    /**
     * 選択ユーザーの詳細ビュー
     * - その人の doing 履歴（最新順）を見出しブロックにして返す
     * - messages は author_user_id から “self/other” を計算して整形する
     */
    const selectedUser = useMemo(() => {
        if (!selectedUserId) return null;

        const user = dbUsers.find((u) => u.id === selectedUserId);
        if (!user) return null;

        const currentDoingKey = getCurrentDoingKey(selectedUserId, userDoings);

        const uds = userDoings
            .filter((ud) => ud.user_id === selectedUserId)
            .slice()
            .sort((a, b) => b.started_at - a.started_at);

        const blocks = [];
        const seen = new Set();
        for (const ud of uds) {
            if (seen.has(ud.doing_key)) continue;
            seen.add(ud.doing_key);

            const msgs = doingMessages
                .filter((m) => m.user_doing_id === ud.id)
                .slice()
                .sort((a, b) => a.created_at - b.created_at)
                .map((m) => {
                    const side =
                        m.author_user_id === selectedUserId ? "self" : "other";
                    const author = dbUsers.find(
                        (u) => u.id === m.author_user_id,
                    );
                    return {
                        side,
                        text: m.text,
                        authorName: author?.name ?? "?",
                        authorUserId: m.author_user_id,
                    };
                });

            blocks.push({
                doingKey: ud.doing_key,
                userDoingId: ud.id,
                startedAt: ud.started_at,
                messages: msgs,
            });
            if (blocks.length >= 4) break;
        }

        return {
            id: user.id,
            name: user.name,
            currentDoing: currentDoingKey,
            logs: blocks,
        };
    }, [selectedUserId, dbUsers, userDoings, doingMessages]);

    const isSelectedMe = selectedUser?.id === CURRENT_USER_ID;

    // -------------------------
    // interactions
    // -------------------------

    /** 点クリックでユーザー選択（詳細パネルを開く） */
    const onClickDot = (id) => {
        setSelectedUserId(id);
    };

    /** メニューからユーザー選択 */
    const onPickUserFromMenu = (id) => setSelectedUserId(id);

    /** Myボタン：いつでも自分の詳細を開く */
    const openMyPanel = () => {
        setSelectedUserId(CURRENT_USER_ID);
    };

    /**
     * 自分の doing 切り替え（user_doingsにINSERT）
     * - 履歴として追加するだけ（更新ではなくINSERT）
     */
    const setMyDoing = (doingKey) => {
        setUserDoings((prev) => {
            const now = Date.now();
            const currentKey = getCurrentDoingKey(CURRENT_USER_ID, prev);
            if (currentKey === doingKey) return prev;

            const newUserDoing = {
                id: `ud-${CURRENT_USER_ID}-${now}-${Math.random().toString(16).slice(2)}`,
                user_id: CURRENT_USER_ID,
                doing_key: doingKey,
                started_at: now,
            };

            // timeline
            setTimeline((tl) => {
                const text = `${currentUser.name}さんが ${doingInfo(doingKey).label} をしています`;
                const item = {
                    id: `${CURRENT_USER_ID}-${now}-${Math.random()}`,
                    text,
                };
                return [...tl, item].slice(-20);
            });

            return [newUserDoing, ...prev].slice(0, 300);
        });
    };

    /**
     * 自分の最新 doing にコメント投稿（doing_messagesにINSERT）
     * - author_user_id で「誰の投稿か」を保持
     */
    const submitMyComment = () => {
        const text = myComment.trim();
        if (!text) return;

        const now = Date.now();
        const currentUd = getCurrentUserDoing(CURRENT_USER_ID, userDoings);
        if (!currentUd) return;

        setDoingMessages((prev) => [
            ...prev,
            {
                id: `m-${currentUd.id}-${now}-${Math.random().toString(16).slice(2)}`,
                user_doing_id: currentUd.id,
                author_user_id: CURRENT_USER_ID,
                text,
                created_at: now,
            },
        ]);

        setMyComment("");
    };

    /**
     * 他人の「doing」にコメント投稿
     * - selectedUserId の最新 user_doing に紐付けて INSERT
     */
    const submitCommentToSelected = () => {
        if (!selectedUserId) return;
        if (selectedUserId === CURRENT_USER_ID) return;

        const text = otherComment.trim();
        if (!text) return;

        const now = Date.now();
        const targetUd = getCurrentUserDoing(selectedUserId, userDoings);
        if (!targetUd) return;

        setDoingMessages((prev) => [
            ...prev,
            {
                id: `m-${targetUd.id}-${now}-${Math.random().toString(16).slice(2)}`,
                user_doing_id: targetUd.id,
                author_user_id: CURRENT_USER_ID,
                text,
                created_at: now,
            },
        ]);

        setOtherComment("");
    };

    /** Enterで送信（自分） */
    const onMyCommentKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitMyComment();
        }
    };

    /** Enterで送信（他人） */
    const onOtherCommentKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitCommentToSelected();
        }
    };

    // -------------------------
    // "賑やかさ"：他人だけ 2.5秒ごとに doing 更新（自分は触らない）
    // -------------------------
    useEffect(() => {
        const t = setInterval(() => {
            setUserDoings((prev) => {
                const others = dbUsers.filter((u) => u.id !== CURRENT_USER_ID);
                const who = pick(others);
                const now = Date.now();

                const currentKey = getCurrentDoingKey(who.id, prev);
                const newDoing = pick(dbDoings).key;
                if (newDoing === currentKey) return prev;

                const newUserDoing = {
                    id: `ud-${who.id}-${now}-${Math.random().toString(16).slice(2)}`,
                    user_id: who.id,
                    doing_key: newDoing,
                    started_at: now,
                };

                // その人本人の一言を自動で付ける（author_user_id = 本人）
                setDoingMessages((msgs) => [
                    ...msgs,
                    {
                        id: `m-${newUserDoing.id}-1`,
                        user_doing_id: newUserDoing.id,
                        author_user_id: who.id,
                        text: "はじめよ〜",
                        created_at: now + 1,
                    },
                ]);

                setTimeline((tl) => {
                    const text = `${who.name}さんが ${doingInfo(newDoing).label} をしています`;
                    const item = {
                        id: `${who.id}-${now}-${Math.random()}`,
                        text,
                    };
                    return [...tl, item].slice(-20);
                });

                return [newUserDoing, ...prev].slice(0, 300);
            });
        }, 2500);

        return () => clearInterval(t);
    }, [dbUsers, dbDoings]);

    // -------------------------
    // 漂い（avatar_states更新）
    // -------------------------
    useEffect(() => {
        const interval = setInterval(() => {
            setAvatarStates((prev) => {
                const el = plazaRef.current;
                if (!el) return prev;

                const rect = el.getBoundingClientRect();
                const minX = 28;
                const minY = 28;
                const maxX = Math.max(minX + 1, rect.width - 28);
                const maxY = Math.max(minY + 1, rect.height - 28);

                return prev.map((a) => {
                    const bias = a.user_id === selectedUserId ? 0.25 : 1.0;
                    const dx = (Math.random() - 0.5) * 18 * bias;
                    const dy = (Math.random() - 0.5) * 18 * bias;
                    return {
                        ...a,
                        x: clamp(a.x + dx, minX, maxX),
                        y: clamp(a.y + dy, minY, maxY),
                    };
                });
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedUserId]);

    return (
        <div style={styles.page}>
            {/* Top bar */}
            <div style={styles.topbar}>
                <div style={styles.brand}>
                    <div style={styles.brandTitle}>zatsudan</div>
                    <div style={styles.brandSub}>
                        いるだけ広場（MVP / 自分操作あり）
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                        style={styles.myBtn}
                        onClick={openMyPanel}
                        title="自分を開く"
                    >
                        My
                    </button>
                </div>
            </div>

            {/* Main */}
            <div style={styles.main}>
                {/* Plaza */}
                <div ref={plazaRef} style={styles.plaza}>
                    <div style={styles.bgLayer} />

                    {/* dots */}
                    {usersView.map((u) => {
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
                                    transform: isSelected
                                        ? "scale(1.4)"
                                        : "scale(1)",
                                    borderColor: isSelected
                                        ? "rgba(0,0,0,0.3)"
                                        : "rgba(0,0,0,0.15)",
                                    boxShadow: isSelected
                                        ? `0 0 0 6px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.15)`
                                        : "0 2px 8px rgba(0,0,0,0.1)",
                                }}
                            >
                                <span
                                    style={{
                                        ...styles.dotCore,
                                        // background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${d.color} 55%, rgba(0,0,0,0.15) 120%)`,
                                        backgroundImage:
                                            'url("/images/avatar/test.png")',
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        backgroundRepeat: "no-repeat",
                                    }}
                                />
                                <span style={styles.dotLabel}>
                                    {d.emoji} {u.name}
                                </span>
                            </button>
                        );
                    })}

                    {/* Selected user panel */}
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
                                    {isSelectedMe && (
                                        <span style={styles.meTag}>自分</span>
                                    )}
                                </div>
                                <button
                                    style={styles.closeBtn}
                                    onClick={() => setSelectedUserId(null)}
                                >
                                    ×
                                </button>
                            </div>

                            {/* 自分操作: doing切り替え + 自分コメント */}
                            {isSelectedMe && (
                                <div style={styles.myControls}>
                                    <div
                                        style={{
                                            fontWeight: 900,
                                            fontSize: 12,
                                            opacity: 0.85,
                                        }}
                                    >
                                        Doing切り替え
                                    </div>

                                    <div style={styles.myDoingGrid}>
                                        {dbDoings.map((d) => {
                                            const active =
                                                d.key ===
                                                selectedUser.currentDoing;
                                            return (
                                                <button
                                                    key={d.key}
                                                    onClick={() =>
                                                        setMyDoing(d.key)
                                                    }
                                                    style={{
                                                        ...styles.doingChip,
                                                        borderColor: active
                                                            ? "rgba(0,0,0,0.22)"
                                                            : "rgba(0,0,0,0.10)",
                                                        background: active
                                                            ? "rgba(0,0,0,0.04)"
                                                            : "#FFFFFF",
                                                    }}
                                                    title={d.label}
                                                >
                                                    <span
                                                        style={{
                                                            marginRight: 8,
                                                        }}
                                                    >
                                                        {d.emoji}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 900,
                                                        }}
                                                    >
                                                        {d.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div style={styles.myCommentRow}>
                                        <textarea
                                            value={myComment}
                                            onChange={(e) =>
                                                setMyComment(e.target.value)
                                            }
                                            onKeyDown={onMyCommentKeyDown}
                                            placeholder="いまのdoingにコメント（Enterで送信 / Shift+Enterで改行）"
                                            style={styles.myTextarea}
                                            rows={2}
                                        />
                                        <button
                                            style={styles.sendBtn}
                                            onClick={submitMyComment}
                                        >
                                            送信
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 他人操作: その人の「今のdoing」にコメント */}
                            {!isSelectedMe && (
                                <div style={styles.myControls}>
                                    <div
                                        style={{
                                            fontWeight: 900,
                                            fontSize: 12,
                                            opacity: 0.85,
                                        }}
                                    >
                                        {(() => {
                                            const di = doingInfo(
                                                selectedUser.currentDoing,
                                            );
                                            return (
                                                <>
                                                    {selectedUser.name}さんの「
                                                    {di.emoji} {di.label}
                                                    」にコメント
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div style={styles.myCommentRow}>
                                        <textarea
                                            value={otherComment}
                                            onChange={(e) =>
                                                setOtherComment(e.target.value)
                                            }
                                            onKeyDown={onOtherCommentKeyDown}
                                            placeholder="Enterで送信 / Shift+Enterで改行"
                                            style={styles.myTextarea}
                                            rows={2}
                                        />
                                        <button
                                            style={styles.sendBtn}
                                            onClick={submitCommentToSelected}
                                        >
                                            送信
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                                <span style={styles.logTime}>
                                                    {formatDoingStartTime(
                                                        log.startedAt,
                                                    )}
                                                </span>
                                            </div>

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
                                                                        <button
                                                                            style={
                                                                                styles.otherTag
                                                                            }
                                                                            onClick={() => {
                                                                                setSelectedUserId(
                                                                                    m.authorUserId,
                                                                                );
                                                                            }}
                                                                            title={`${m.authorName}さんを見る`}
                                                                        >
                                                                            {
                                                                                m.authorName
                                                                            }
                                                                        </button>
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

                {/* Right drawer */}
                <div style={styles.drawer}>
                    <div style={styles.drawerHeader}>みんなたち</div>

                    <div style={styles.drawerList}>
                        {usersView.map((u) => {
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
