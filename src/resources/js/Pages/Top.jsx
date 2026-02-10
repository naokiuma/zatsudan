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
// Mock "Topics"（5分ごとに切り替わる）
// =========================
const TOPICS = [
    { id: "t1", title: "いま飲んでるものは？", desc: "水でもコーヒーでも☺️" },
    { id: "t2", title: "今日いちばん進んだことは？", desc: "小さくてもOK！" },
    { id: "t3", title: "最近ハマってる作業BGMは？", desc: "音なしでも可！" },
    { id: "t4", title: "いまの気分を絵文字1つで！", desc: "🙂😇😪🥺🔥 など" },
    { id: "t5", title: "今日のごほうび、何にする？", desc: "甘いの？寝る？" },
    { id: "t6", title: "今やってること、一言で！", desc: "勉強/仕事/休憩など" },
];

// =========================
// Mock "Radio tracks"（UIだけ。音は後でHowlerに差し替え）
// =========================
const RADIO_TRACKS = [
    { id: "r1", title: "Lo-fi Afternoon", artist: "zatsudan DJ" },
    { id: "r2", title: "Rainy Coding", artist: "zatsudan DJ" },
    { id: "r3", title: "Midnight Study", artist: "zatsudan DJ" },
];

// =========================
// Mock "DB tables"
// =========================
const DOINGS = [
    {
        key: "study",
        label: "勉強",
        emoji: "📚",
        color: "#3B82F6",
        moveChance: 0.3,
        moveDistance: 4,
        cssAnim: "doing-subtle-wobble 3s ease-in-out infinite",
    },
    {
        key: "movie",
        label: "映画鑑賞",
        emoji: "🍿",
        color: "#F97316",
        moveChance: 0.1,
        moveDistance: 2,
        cssAnim: "doing-bounce 4s ease-in-out infinite",
    },
    {
        key: "work",
        label: "仕事",
        emoji: "💻",
        color: "#10B981",
        moveChance: 0.5,
        moveDistance: 6,
        cssAnim: "doing-shake 2s ease-in-out infinite",
    },
    {
        key: "game",
        label: "ゲーム",
        emoji: "🎮",
        color: "#EC4899",
        moveChance: 1.0,
        moveDistance: 25,
        cssAnim: "doing-energetic 0.5s ease-in-out infinite",
    },
    {
        key: "clean",
        label: "お掃除",
        emoji: "🧹",
        color: "#A855F7",
        moveChance: 0.7,
        moveDistance: 10,
        cssAnim: "doing-sway 2s ease-in-out infinite",
    },
    {
        key: "think",
        label: "考え中",
        emoji: "💭",
        color: "#F59E0B",
        moveChance: 0.2,
        moveDistance: 3,
        cssAnim: "doing-float 4s ease-in-out infinite",
    },
    {
        key: "idle",
        label: "何もしてない",
        emoji: "",
        color: "#9CA3AF",
        moveChance: 0,
        moveDistance: 0,
        cssAnim: "none",
    },
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

//topcコメント用の初期データビルダー
function buildInitialTopicComments() {
    const now = Date.now();
    // ちょい雰囲気だけ入れとく
    return [
        {
            id: `tc-1`,
            topic_id: "t1",
            author_user_id: 2,
            text: "白湯〜",
            created_at: now - 1000 * 60 * 2,
        },
        {
            id: `tc-2`,
            topic_id: "t1",
            author_user_id: 1,
            text: "コーヒー☺️",
            created_at: now - 1000 * 60 * 1,
        },
    ];
}

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

    // ---- Topic state ----
    const [currentTopic, setCurrentTopic] = useState(() => TOPICS[0]);
    const [topicOverlay, setTopicOverlay] = useState(null);
    const [isTopicPanelOpen, setIsTopicPanelOpen] = useState(false);

    const [topicComments, setTopicComments] = useState(() =>
        buildInitialTopicComments(),
    );
    const [topicComment, setTopicComment] = useState(""); // 入力欄
    const overlayTimerRef = useRef(null);

    // ---- Radio UI state（音はまだ鳴らさない：UIだけ）----
    const [radioOn, setRadioOn] = useState(() => {
        try {
            return localStorage.getItem("z_radio_on") === "1";
        } catch {
            return false;
        }
    });
    const [radioVolume, setRadioVolume] = useState(() => {
        try {
            const v = localStorage.getItem("z_radio_vol");
            return v ? Number(v) : 0.35;
        } catch {
            return 0.35;
        }
    });
    const [radioTrack, setRadioTrack] = useState(() => RADIO_TRACKS[0]);

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
                    if (m.isSystem) {
                        return {
                            side: "system",
                            text: m.text,
                            isSystem: true,
                        };
                    }
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

    const currentTopicComments = useMemo(() => {
        const list = topicComments
            .filter((c) => c.topic_id === currentTopic.id)
            .slice()
            .sort((a, b) => a.created_at - b.created_at)
            .slice(-30);

        return list.map((c) => {
            const author = dbUsers.find((u) => u.id === c.author_user_id);
            const side =
                c.author_user_id === CURRENT_USER_ID ? "other" : "self";
            // ↑ “右寄せ/左寄せ” を doing と合わせたいならここを調整
            // ここでは「自分の発言を右寄せ」にしたいなら side を逆にしてOK
            return {
                id: c.id,
                text: c.text,
                authorName: author?.name ?? "?",
                authorUserId: c.author_user_id,
                side: c.author_user_id === CURRENT_USER_ID ? "other" : "self",
            };
        });
    }, [topicComments, currentTopic.id, dbUsers]);

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

            const currentUd = getCurrentUserDoing(CURRENT_USER_ID, prev);

            const newUserDoing = {
                id: `ud-${CURRENT_USER_ID}-${now}-${Math.random().toString(16).slice(2)}`,
                user_id: CURRENT_USER_ID,
                doing_key: doingKey,
                started_at: now,
            };

            // システムメッセージ（終了 + 開始）
            setDoingMessages((msgs) => {
                const sysMsgs = [];
                if (currentUd) {
                    sysMsgs.push({
                        id: `sys-${currentUd.id}-end-${now}`,
                        user_doing_id: currentUd.id,
                        author_user_id: CURRENT_USER_ID,
                        text: `${doingInfo(currentKey).label}を終了しました`,
                        created_at: now,
                        isSystem: true,
                    });
                }
                sysMsgs.push({
                    id: `sys-${newUserDoing.id}-start-${now}`,
                    user_doing_id: newUserDoing.id,
                    author_user_id: CURRENT_USER_ID,
                    text: `${doingInfo(doingKey).label}を開始しました`,
                    created_at: now + 1,
                    isSystem: true,
                });
                return [...msgs, ...sysMsgs];
            });

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

    const submitTopicComment = () => {
        const text = topicComment.trim();
        if (!text) return;

        const now = Date.now();
        setTopicComments((prev) => [
            ...prev,
            {
                id: `tc-${currentTopic.id}-${now}-${Math.random().toString(16).slice(2)}`,
                topic_id: currentTopic.id,
                author_user_id: CURRENT_USER_ID,
                text,
                created_at: now,
            },
        ]);

        // timelineにも流す（場の空気）
        setTimeline((tl) => {
            const item = {
                id: `topicc-${now}-${Math.random()}`,
                text: `💬 ${currentUser.name}さんが テーマ「${currentTopic.title}」にコメントしました`,
            };
            return [...tl, item].slice(-20);
        });

        setTopicComment("");
    };

    const onTopicCommentKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitTopicComment();
        }
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

    useEffect(() => {
        try {
            localStorage.setItem("z_radio_on", radioOn ? "1" : "0");
        } catch {}
    }, [radioOn]);

    useEffect(() => {
        try {
            localStorage.setItem("z_radio_vol", String(radioVolume));
        } catch {}
    }, [radioVolume]);

    // 曲は “雰囲気” のために 8分ごとに変える（UI表示が変わるだけ）
    useEffect(() => {
        const TRACK_MS = 8 * 60 * 1000;
        const tick = () => {
            const slot = Math.floor(Date.now() / TRACK_MS);
            const idx = slot % RADIO_TRACKS.length;
            setRadioTrack(RADIO_TRACKS[idx]);
        };
        tick();
        const t = setInterval(tick, 5000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const INTERVAL_MS = 5 * 60 * 1000; // 5分（テストなら 10*1000 などに）
        const CHECK_MS = 3000; // 3秒おきに切替境目を検知

        const getTopicByTime = () => {
            const slot = Math.floor(Date.now() / INTERVAL_MS);
            const idx = slot % TOPICS.length;
            return TOPICS[idx];
        };

        const announce = (topic) => {
            if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
            setTopicOverlay({ ...topic, announcedAt: Date.now() });

            overlayTimerRef.current = setTimeout(
                () => setTopicOverlay(null),
                3800,
            );
        };

        const first = getTopicByTime();
        setCurrentTopic(first);
        announce(first);

        const t = setInterval(() => {
            const next = getTopicByTime();
            setCurrentTopic((prev) => {
                if (!prev || prev.id !== next.id) {
                    announce(next);
                    setTimeline((tl) => {
                        const item = {
                            id: `topic-${Date.now()}-${Math.random()}`,
                            text: `📻 テーマが変わりました：${next.title}`,
                        };
                        return [...tl, item].slice(-20);
                    });
                    // テーマが変わった瞬間、テーマパネルが開いてたら入力を消す（好み）
                    setTopicComment("");
                    return next;
                }
                return prev;
            });
        }, CHECK_MS);

        return () => {
            clearInterval(t);
            if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        };
    }, []);

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
                const currentUd = getCurrentUserDoing(who.id, prev);
                const newDoing = pick(
                    dbDoings.filter((d) => d.key !== "idle"),
                ).key;
                if (newDoing === currentKey) return prev;

                const newUserDoing = {
                    id: `ud-${who.id}-${now}-${Math.random().toString(16).slice(2)}`,
                    user_id: who.id,
                    doing_key: newDoing,
                    started_at: now,
                };

                // システムメッセージ + 本人の一言
                setDoingMessages((msgs) => {
                    const newMsgs = [];
                    if (currentUd) {
                        newMsgs.push({
                            id: `sys-${currentUd.id}-end-${now}`,
                            user_doing_id: currentUd.id,
                            author_user_id: who.id,
                            text: `${doingInfo(currentKey).label}を終了しました`,
                            created_at: now,
                            isSystem: true,
                        });
                    }
                    newMsgs.push({
                        id: `sys-${newUserDoing.id}-start-${now}`,
                        user_doing_id: newUserDoing.id,
                        author_user_id: who.id,
                        text: `${doingInfo(newDoing).label}を開始しました`,
                        created_at: now + 1,
                        isSystem: true,
                    });
                    newMsgs.push({
                        id: `m-${newUserDoing.id}-1`,
                        user_doing_id: newUserDoing.id,
                        author_user_id: who.id,
                        text: "はじめよ〜",
                        created_at: now + 2,
                    });
                    return [...msgs, ...newMsgs];
                });

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
    // 漂い（avatar_states更新）— doing別の動きプロファイルを適用
    // -------------------------
    const usersViewRef = useRef(usersView);
    usersViewRef.current = usersView;

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

                const currentUsersView = usersViewRef.current;

                return prev.map((a) => {
                    const uv = currentUsersView.find((u) => u.id === a.user_id);
                    const di = uv ? doingInfo(uv.currentDoing) : DOINGS[0];

                    // doing別の移動確率と距離
                    const moveChance = di.moveChance ?? 1.0;
                    const moveDistance = di.moveDistance ?? 18;

                    // 選択中のユーザーは動きを抑制
                    const selectBias =
                        a.user_id === selectedUserId ? 0.25 : 1.0;

                    // 確率チェック: 動かない場合はそのまま返す
                    if (Math.random() > moveChance) return a;

                    const dx =
                        (Math.random() - 0.5) * moveDistance * selectBias;
                    const dy =
                        (Math.random() - 0.5) * moveDistance * selectBias;
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
            {/* Topic overlay */}
            {topicOverlay && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            padding: "14px 16px",
                            borderRadius: 16,
                            background: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(0,0,0,0.10)",
                            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                            backdropFilter: "blur(10px)",
                            maxWidth: 520,
                            width: "min(520px, calc(100vw - 48px))",
                            transform: "translateY(-10px)",
                            animation: "topic-pop 3.8s ease-in-out forwards",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 12,
                                opacity: 0.7,
                                fontWeight: 800,
                            }}
                        >
                            🔔 今日のテーマ
                        </div>
                        <div
                            style={{
                                fontSize: 18,
                                fontWeight: 900,
                                marginTop: 6,
                            }}
                        >
                            {topicOverlay.title}
                        </div>
                        {topicOverlay.desc ? (
                            <div
                                style={{
                                    fontSize: 13,
                                    opacity: 0.8,
                                    marginTop: 6,
                                }}
                            >
                                {topicOverlay.desc}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

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
                                        backgroundImage:
                                            'url("/images/avatar/test.png")',
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        backgroundRepeat: "no-repeat",
                                        animation: d.cssAnim || "none",
                                    }}
                                />
                                <span style={styles.dotLabel}>
                                    {d.emoji ? `${d.emoji} ` : ""}
                                    {u.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right drawer (右サイド：ここに統一) */}
                <div style={styles.drawer}>
                    {/* ヘッダー */}
                    <div style={styles.drawerHeader}>
                        {selectedUser ? (
                            <div style={styles.drawerHeaderRow}>
                                <div style={{ fontWeight: 900 }}>
                                    {selectedUser.name}
                                </div>
                                <button
                                    style={styles.closeBtn}
                                    onClick={() => setSelectedUserId(null)}
                                    title="閉じる"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div style={{ fontWeight: 900 }}>みんなたち</div>
                        )}
                    </div>

                    {/* 中身 */}
                    <div style={styles.drawerBody}>
                        {/* ===== Topic + Radio (always visible) ===== */}
                        <div style={{ marginBottom: 12 }}>
                            {/* Radio mini */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    background: "rgba(255,255,255,0.85)",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    marginBottom: 10,
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            opacity: 0.7,
                                            fontWeight: 900,
                                        }}
                                    >
                                        📻 Radio
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 900,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        ♪ {radioTrack.title} —{" "}
                                        {radioTrack.artist}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                    }}
                                >
                                    <button
                                        onClick={() => setRadioOn((v) => !v)}
                                        style={{
                                            padding: "8px 10px",
                                            borderRadius: 10,
                                            border: "1px solid rgba(0,0,0,0.10)",
                                            background: radioOn
                                                ? "rgba(0,0,0,0.06)"
                                                : "#fff",
                                            fontWeight: 900,
                                            cursor: "pointer",
                                        }}
                                        title="（mock）いまは音は鳴らさずUIだけ"
                                    >
                                        {radioOn ? "ON" : "OFF"}
                                    </button>

                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={radioVolume}
                                        onChange={(e) =>
                                            setRadioVolume(
                                                Number(e.target.value),
                                            )
                                        }
                                        style={{ width: 80 }}
                                        title={`Volume: ${Math.round(radioVolume * 100)}%`}
                                    />
                                </div>
                            </div>

                            {/* Topic card */}
                            <button
                                onClick={() => setIsTopicPanelOpen((v) => !v)}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    background: "rgba(255,255,255,0.85)",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    cursor: "pointer",
                                }}
                                title="クリックでテーマのコメント欄を開く"
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                opacity: 0.7,
                                                fontWeight: 900,
                                            }}
                                        >
                                            🔔 今のテーマ
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 900,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {currentTopic.title}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            opacity: 0.65,
                                            fontWeight: 900,
                                        }}
                                    >
                                        {isTopicPanelOpen ? "▲" : "▼"}
                                    </div>
                                </div>

                                {currentTopic.desc ? (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 12,
                                            opacity: 0.75,
                                        }}
                                    >
                                        {currentTopic.desc}
                                    </div>
                                ) : null}
                            </button>

                            {/* Topic panel */}
                            {isTopicPanelOpen && (
                                <div
                                    style={{
                                        marginTop: 10,
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        background: "rgba(255,255,255,0.78)",
                                        border: "1px solid rgba(0,0,0,0.08)",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 900,
                                            opacity: 0.8,
                                            marginBottom: 8,
                                        }}
                                    >
                                        💬 テーマへのコメント
                                    </div>

                                    {/* コメント一覧（doingの見た目を流用） */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 8,
                                            maxHeight: 220,
                                            overflow: "auto",
                                            paddingRight: 4,
                                        }}
                                    >
                                        {currentTopicComments.length === 0 ? (
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    opacity: 0.6,
                                                }}
                                            >
                                                （まだコメントなし）
                                            </div>
                                        ) : (
                                            currentTopicComments.map((m) => (
                                                <div
                                                    key={m.id}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            m.authorUserId ===
                                                            CURRENT_USER_ID
                                                                ? "flex-end"
                                                                : "flex-start",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            padding: "8px 10px",
                                                            borderRadius: 12,
                                                            border: "1px solid rgba(0,0,0,0.10)",
                                                            background:
                                                                m.authorUserId ===
                                                                CURRENT_USER_ID
                                                                    ? "#4A90E2"
                                                                    : "#F0F0F0",
                                                            color:
                                                                m.authorUserId ===
                                                                CURRENT_USER_ID
                                                                    ? "#fff"
                                                                    : "#333",
                                                            maxWidth: "90%",
                                                            fontSize: 13,
                                                            lineHeight: 1.35,
                                                            position:
                                                                "relative",
                                                        }}
                                                        title={m.authorName}
                                                    >
                                                        {m.text}
                                                        {m.authorUserId !==
                                                            CURRENT_USER_ID && (
                                                            <button
                                                                style={{
                                                                    marginLeft: 10,
                                                                    padding:
                                                                        "2px 8px",
                                                                    borderRadius: 999,
                                                                    border: "1px solid rgba(0,0,0,0.10)",
                                                                    background:
                                                                        "rgba(255,255,255,0.35)",
                                                                    color:
                                                                        m.authorUserId ===
                                                                        CURRENT_USER_ID
                                                                            ? "#fff"
                                                                            : "#333",
                                                                    fontSize: 11,
                                                                    fontWeight: 900,
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() =>
                                                                    setSelectedUserId(
                                                                        m.authorUserId,
                                                                    )
                                                                }
                                                                title={`${m.authorName}さんを見る`}
                                                            >
                                                                {m.authorName}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* 入力欄 */}
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            marginTop: 10,
                                            alignItems: "stretch",
                                        }}
                                    >
                                        <textarea
                                            value={topicComment}
                                            onChange={(e) =>
                                                setTopicComment(e.target.value)
                                            }
                                            onKeyDown={onTopicCommentKeyDown}
                                            placeholder="テーマにひとこと（Enterで送信 / Shift+Enterで改行）"
                                            style={{
                                                flex: 1,
                                                resize: "none",
                                                borderRadius: 12,
                                                border: "1px solid rgba(0,0,0,0.10)",
                                                padding: "8px 10px",
                                                fontSize: 13,
                                                outline: "none",
                                                background: "#fff",
                                            }}
                                            rows={2}
                                        />
                                        <button
                                            onClick={submitTopicComment}
                                            style={{
                                                padding: "8px 12px",
                                                borderRadius: 12,
                                                border: "1px solid rgba(0,0,0,0.10)",
                                                background: "#fff",
                                                fontWeight: 900,
                                                cursor: "pointer",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            送信
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedUser ? (
                            <div style={styles.drawerDetailOverlay}>
                                {/* 自分操作 */}
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
                                            {dbDoings
                                                .filter((d) => d.key !== "idle")
                                                .map((d) => {
                                                    const active =
                                                        d.key ===
                                                        selectedUser.currentDoing;
                                                    return (
                                                        <button
                                                            key={d.key}
                                                            onClick={() =>
                                                                setMyDoing(
                                                                    d.key,
                                                                )
                                                            }
                                                            style={{
                                                                ...styles.doingChip,
                                                                borderColor:
                                                                    active
                                                                        ? "rgba(0,0,0,0.22)"
                                                                        : "rgba(0,0,0,0.10)",
                                                                background:
                                                                    active
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

                                        <button
                                            onClick={() => setMyDoing("idle")}
                                            disabled={
                                                selectedUser.currentDoing ===
                                                "idle"
                                            }
                                            style={{
                                                ...styles.stopBtn,
                                                opacity:
                                                    selectedUser.currentDoing ===
                                                    "idle"
                                                        ? 0.4
                                                        : 1,
                                                cursor:
                                                    selectedUser.currentDoing ===
                                                    "idle"
                                                        ? "default"
                                                        : "pointer",
                                            }}
                                        >
                                            終了する
                                        </button>

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

                                {/* 他人にコメント */}
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
                                                        {selectedUser.name}
                                                        さんの「{di.emoji}{" "}
                                                        {di.label}」にコメント
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        <div style={styles.myCommentRow}>
                                            <textarea
                                                value={otherComment}
                                                onChange={(e) =>
                                                    setOtherComment(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={
                                                    onOtherCommentKeyDown
                                                }
                                                placeholder="Enterで送信 / Shift+Enterで改行"
                                                style={styles.myTextarea}
                                                rows={2}
                                            />
                                            <button
                                                style={styles.sendBtn}
                                                onClick={
                                                    submitCommentToSelected
                                                }
                                            >
                                                送信
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* logs */}
                                <div style={styles.logs}>
                                    {selectedUser.logs.map((log, logIdx) => {
                                        const di = doingInfo(log.doingKey);
                                        const isCurrent = logIdx === 0;
                                        return (
                                            <div
                                                key={log.doingKey}
                                                style={{
                                                    ...styles.logBlock,
                                                    ...(isCurrent
                                                        ? {
                                                              borderLeft:
                                                                  "3px solid #3B82F6",
                                                          }
                                                        : { opacity: 0.5 }),
                                                }}
                                            >
                                                <div style={styles.logHeading}>
                                                    <span
                                                        style={{
                                                            marginRight: 8,
                                                        }}
                                                    >
                                                        {di.emoji}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 800,
                                                        }}
                                                    >
                                                        {di.label}
                                                    </span>
                                                    <span
                                                        style={styles.logTime}
                                                    >
                                                        {formatDoingStartTime(
                                                            log.startedAt,
                                                        )}
                                                    </span>
                                                </div>

                                                <div style={styles.msgList}>
                                                    {log.messages.length ===
                                                    0 ? (
                                                        <div
                                                            style={
                                                                styles.msgHint
                                                            }
                                                        >
                                                            （まだコメントなし）
                                                        </div>
                                                    ) : (
                                                        log.messages.map(
                                                            (m, idx) =>
                                                                m.isSystem ? (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        style={
                                                                            styles.systemMsg
                                                                        }
                                                                    >
                                                                        {m.text}
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
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
                                                                            {
                                                                                m.text
                                                                            }
                                                                            {m.side ===
                                                                                "other" && (
                                                                                <button
                                                                                    style={
                                                                                        styles.otherTag
                                                                                    }
                                                                                    onClick={() =>
                                                                                        setSelectedUserId(
                                                                                            m.authorUserId,
                                                                                        )
                                                                                    }
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
                        ) : (
                            <div style={styles.drawerList}>
                                {usersView.map((u) => {
                                    const d = doingInfo(u.currentDoing);
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() =>
                                                onPickUserFromMenu(u.id)
                                            }
                                            style={styles.userRow}
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
                        )}
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
