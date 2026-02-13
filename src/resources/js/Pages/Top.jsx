import React, { useEffect, useMemo, useRef, useState } from "react";

import "./Top.css";
import axios from "axios";

/**
 * MVP: 15点 / 右サイドメニュー(普段は閉) / 下タイムライン
 * DB設計っぽい「テーブル構造」から状態を合成して描画する版
 *
 * 追加:
 * - 自分（currentUserId）の doing 切り替え
 * - 自分の最新 doing へコメント投稿
 * - 他人の「今の doing」にもコメント投稿（author_user_id で誰が書いたか管理）
 */

// =========================
// Mock "Radio tracks"（UIだけ。音は後でHowlerに差し替え）
// =========================
const RADIO_TRACKS = [
    { id: "r1", title: "Lo-fi Afternoon", artist: "zatsudan DJ" },
    { id: "r2", title: "Rainy Coding", artist: "zatsudan DJ" },
    { id: "r3", title: "Midnight Study", artist: "zatsudan DJ" },
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
// Mock data builders (フロント固有)
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
function getCurrentDoingKey(userId, userDoings, doingTypes) {
    return (
        getCurrentUserDoing(userId, userDoings)?.doing_key ??
        doingTypes[0]?.key ??
        "idle"
    );
}

export default function Top({
    doingTypes = [],
    topics: propsTopics = [],
    users: propsUsers = [],
    currentUserId = null,
    doings: propsDoings = [],
    doingComments: propsDoingComments = [],
    topicComments: propsTopicComments = [],
    roomId = null,
}) {
    const plazaRef = useRef(null);

    /** doing key から表示用情報（絵文字・色・ラベル）を引く */
    const doingInfo = (key) => {
        return (
            doingTypes.find((d) => d.key === key) ??
            doingTypes[0] ?? {
                key: "idle",
                label: "何もしてない",
                emoji: "",
                color: "#9CA3AF",
                moveChance: 0,
                moveDistance: 0,
                cssAnim: "none",
            }
        );
    };

    // ---- DB-backed state ----
    const [dbUsers] = useState(() => propsUsers);
    const [dbDoings] = useState(() => doingTypes);

    // user_doings: propsDoings を初期値に + フロントで賑やかし追加分
    const [userDoings, setUserDoings] = useState(() => {
        // サーバーから来た doings をフロントのフォーマットに合わせる
        // id は DB の id をそのまま使う (数値)
        if (propsDoings.length > 0) {
            return propsDoings.map((d) => ({
                id: `ud-${d.id}`,
                user_id: d.user_id,
                doing_key: d.doing_key,
                started_at: d.started_at,
            }));
        }
        // フォールバック: 全ユーザーに idle を割り当て
        const now = Date.now();
        return propsUsers.map((u, i) => ({
            id: `ud-${u.id}-init`,
            user_id: u.id,
            doing_key: doingTypes[0]?.key ?? "idle",
            started_at: now - (i + 1) * 1000 * 30,
        }));
    });

    // doing_messages: propsDoingComments を初期値に
    const [doingMessages, setDoingMessages] = useState(() => {
        if (propsDoingComments.length > 0) {
            return propsDoingComments.map((c) => ({
                id: `m-${c.id}`,
                user_doing_id: `ud-${c.doing_id}`,
                author_user_id: c.author_user_id,
                text: c.text,
                created_at: c.created_at,
            }));
        }
        return [];
    });

    const [avatarStates, setAvatarStates] = useState(() =>
        buildInitialAvatarStates(propsUsers.map((u) => u.id)),
    );

    // ---- Topic state ----
    const [currentTopic, setCurrentTopic] = useState(
        () => propsTopics[0] ?? { id: 0, title: "", desc: "" },
    );
    const [topicOverlay, setTopicOverlay] = useState(null);
    const [isTopicPanelOpen, setIsTopicPanelOpen] = useState(false);

    const [topicComments, setTopicComments] = useState(() =>
        propsTopicComments.map((c) => ({
            id: `tc-${c.id}`,
            topic_id: c.topic_id,
            author_user_id: c.author_user_id,
            text: c.text,
            created_at: c.created_at,
        })),
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
            dbUsers.find((u) => u.id === currentUserId) ?? {
                id: currentUserId,
                name: "me",
            },
        [dbUsers, currentUserId],
    );

    // timeline
    const [timeline, setTimeline] = useState(() => {
        const initial = dbUsers.slice(0, 6).map((u) => {
            const currentDoingKey = getCurrentDoingKey(
                u.id,
                userDoings,
                doingTypes,
            );
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
                currentDoing: current?.doing_key ?? dbDoings[0]?.key ?? "idle",
                pos: pos ? { x: pos.x, y: pos.y } : { x: 100, y: 100 },
            };
        });
    }, [dbUsers, dbDoings, userDoings, avatarStates]);

    /**
     * 選択ユーザーの詳細ビュー
     * - その人の doing 履歴（最新順）を見出しブロックにして返す
     * - messages は author_user_id から "self/other" を計算して整形する
     */
    const selectedUser = useMemo(() => {
        if (!selectedUserId) return null;

        const user = dbUsers.find((u) => u.id === selectedUserId);
        if (!user) return null;

        const currentDoingKey = getCurrentDoingKey(
            selectedUserId,
            userDoings,
            doingTypes,
        );

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
    }, [selectedUserId, dbUsers, userDoings, doingMessages, doingTypes]);

    const isSelectedMe = selectedUser?.id === currentUserId;

    const currentTopicComments = useMemo(() => {
        const list = topicComments
            .filter((c) => c.topic_id === currentTopic.id)
            .slice()
            .sort((a, b) => a.created_at - b.created_at)
            .slice(-30);

        return list.map((c) => {
            const author = dbUsers.find((u) => u.id === c.author_user_id);
            return {
                id: c.id,
                text: c.text,
                authorName: author?.name ?? "?",
                authorUserId: c.author_user_id,
                side: c.author_user_id === currentUserId ? "other" : "self",
            };
        });
    }, [topicComments, currentTopic.id, dbUsers, currentUserId]);

    // -------------------------
    // interactions
    // -------------------------

    /**
     * 汎用コメント送信ロジック（楽観的更新 + サーバー保存 + 置き換え）
     * @param {Object} options
     * @param {Function} options.setState - state更新関数 (例: setDoingMessages)
     * @param {Function} options.createTempComment - 仮コメントオブジェクトを作る関数
     * @param {string} options.apiUrl - POSTするエンドポイント
     * @param {Object} options.apiData - POSTするデータ
     * @param {Function} options.mapResponse - レスポンスを正式コメントに変換する関数
     * @param {Function} [options.onSuccess] - 送信成功時の追加処理（オプション）
     */
    const submitCommentGeneric = async ({
        setState,
        createTempComment,
        apiUrl,
        apiData,
        mapResponse,
        onSuccess,
    }) => {
        const tempComment = createTempComment();

        // 1. 楽観的更新（仮データで即座に表示）
        setState((prev) => [...prev, tempComment]);

        // 2. サーバーに保存
        try {
            const res = await axios.post(apiUrl, apiData);

            // 3. サーバーの正式データで置き換え
            setState((prev) =>
                prev.map((c) =>
                    c.id === tempComment.id ? mapResponse(res.data) : c,
                ),
            );

            // 4. 成功時の追加処理（オプション）
            if (onSuccess) onSuccess(res.data);
        } catch (err) {
            console.error(`コメント保存エラー (${apiUrl}):`, err);

            // 5. エラー時は削除してユーザーに通知
            setState((prev) => prev.filter((c) => c.id !== tempComment.id));
            alert("コメントの送信に失敗しました。もう一度お試しください。");
        }
    };

    /** 点クリックでユーザー選択（詳細パネルを開く） */
    const onClickDot = (id) => {
        setSelectedUserId(id);
    };

    /** メニューからユーザー選択 */
    const onPickUserFromMenu = (id) => setSelectedUserId(id);

    /** Myボタン：いつでも自分の詳細を開く */
    const openMyPanel = () => {
        if (currentUserId) {
            setSelectedUserId(currentUserId);
        }
    };

    /**
     * 自分の doing 切り替え（user_doingsにINSERT）
     * - 履歴として追加するだけ（更新ではなくINSERT）
     * - 楽観的更新 + サーバー保存
     */
    const setMyDoing = (doingKey) => {
        if (!currentUserId) return;

        setUserDoings((prev) => {
            const now = Date.now();
            const currentKey = getCurrentDoingKey(
                currentUserId,
                prev,
                doingTypes,
            );
            if (currentKey === doingKey) return prev;

            const currentUd = getCurrentUserDoing(currentUserId, prev);

            const newUserDoing = {
                id: `ud-${currentUserId}-${now}-${Math.random().toString(16).slice(2)}`,
                user_id: currentUserId,
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
                        author_user_id: currentUserId,
                        text: `${doingInfo(currentKey).label}を終了しました`,
                        created_at: now,
                        isSystem: true,
                    });
                }
                sysMsgs.push({
                    id: `sys-${newUserDoing.id}-start-${now}`,
                    user_doing_id: newUserDoing.id,
                    author_user_id: currentUserId,
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
                    id: `${currentUserId}-${now}-${Math.random()}`,
                    text,
                };
                return [...tl, item].slice(-20);
            });

            // サーバーに保存 → レスポンスのDB IDで置き換え
            axios
                .post("/api/doing/switch", { doing_type_key: doingKey })
                .then((res) => {
                    const dbId = res.data.id;
                    const tempId = newUserDoing.id;
                    setUserDoings((prev) =>
                        prev.map((ud) =>
                            ud.id === tempId ? { ...ud, id: `ud-${dbId}` } : ud,
                        ),
                    );
                    setDoingMessages((prev) =>
                        prev.map((m) =>
                            m.user_doing_id === tempId
                                ? { ...m, user_doing_id: `ud-${dbId}` }
                                : m,
                        ),
                    );
                })
                .catch((err) => {
                    console.error("doing切替保存エラー:", err);
                });

            return [newUserDoing, ...prev].slice(0, 300);
        });
    };

    /// テーマへのコメント投稿
    const submitTopicComment = async () => {
        const text = topicComment.trim();
        if (!text) return;
        if (!currentUserId) return;

        setTopicComment("");

        await submitCommentGeneric({
            setState: setTopicComments,
            createTempComment: () => ({
                id: `temp-tc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                topic_id: currentTopic.id,
                author_user_id: currentUserId,
                text,
                created_at: Date.now(),
                isPending: true,
            }),
            apiUrl: "/api/topic/comment",
            apiData: {
                topic_id: currentTopic.id,
                content: text,
            },
            mapResponse: (data) => ({
                id: `tc-${data.id}`,
                topic_id: data.topic_id,
                author_user_id: data.author_user_id,
                text: data.text,
                created_at: data.created_at,
            }),
            onSuccess: () => {
                // timelineにも流す（場の空気）
                setTimeline((tl) => {
                    const item = {
                        id: `topicc-${Date.now()}-${Math.random()}`,
                        text: `💬 ${currentUser.name}さんが テーマ「${currentTopic.title}」にコメントしました`,
                    };
                    return [...tl, item].slice(-20);
                });
            },
        });
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
     * - 楽観的更新 + サーバーレスポンスで正式データに置き換え
     */
    const submitMyComment = async () => {
        const text = myComment.trim();
        if (!text) return;
        if (!currentUserId) return;

        const currentUd = getCurrentUserDoing(currentUserId, userDoings);
        if (!currentUd) return;

        const doingDbId = currentUd.id.replace("ud-", "");
        if (!doingDbId || isNaN(Number(doingDbId))) return;

        setMyComment("");

        await submitCommentGeneric({
            setState: setDoingMessages,
            createTempComment: () => ({
                id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                user_doing_id: currentUd.id,
                author_user_id: currentUserId,
                text,
                created_at: Date.now(),
                isPending: true,
            }),
            apiUrl: "/api/doing/comment",
            apiData: {
                doing_id: Number(doingDbId),
                content: text,
            },
            mapResponse: (data) => ({
                id: `m-${data.id}`,
                user_doing_id: `ud-${data.doing_id}`,
                author_user_id: data.author_user_id,
                text: data.text,
                created_at: data.created_at,
            }),
        });
    };

    /**
     * 他人の「doing」にコメント投稿
     * - selectedUserId の最新 user_doing に紐付けて INSERT
     * - 楽観的更新 + サーバーレスポンスで正式データに置き換え
     */
    const submitCommentToOtherUser = async () => {
        if (!selectedUserId) return;
        if (selectedUserId === currentUserId) return;
        if (!currentUserId) return;

        const text = otherComment.trim();
        if (!text) return;

        const targetUd = getCurrentUserDoing(selectedUserId, userDoings);
        if (!targetUd) return;

        const doingDbId = targetUd.id.replace("ud-", "");
        if (!doingDbId || isNaN(Number(doingDbId))) return;

        setOtherComment("");

        await submitCommentGeneric({
            setState: setDoingMessages,
            createTempComment: () => ({
                id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                user_doing_id: targetUd.id,
                author_user_id: currentUserId,
                text,
                created_at: Date.now(),
                isPending: true,
            }),
            apiUrl: "/api/doing/comment",
            apiData: {
                doing_id: Number(doingDbId),
                content: text,
            },
            mapResponse: (data) => ({
                id: `m-${data.id}`,
                user_doing_id: `ud-${data.doing_id}`,
                author_user_id: data.author_user_id,
                text: data.text,
                created_at: data.created_at,
            }),
        });
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
            submitCommentToOtherUser();
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

    // 曲は "雰囲気" のために 8分ごとに変える（UI表示が変わるだけ）
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

    // -------------------------
    // ラジオトピック自動切替 + オーバーレイ表示
    useEffect(() => {
        if (propsTopics.length === 0) return;

        const INTERVAL_MS = 5 * 60 * 1000; // 5分
        const CHECK_MS = 3000;

        const getTopicByTime = () => {
            const slot = Math.floor(Date.now() / INTERVAL_MS);
            const idx = slot % propsTopics.length;
            return propsTopics[idx];
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
    }, [propsTopics]);

    // -------------------------
    // "賑やかさ"：他人だけ定期的に doing 更新（自分は触らない）
    // TODO: 将来的には各ユーザーが自分で切り替える。フロント自動更新は不要になる。
    // -------------------------
    // useEffect(() => {
    //     const t = setInterval(() => {
    //         setUserDoings((prev) => {
    //             const others = dbUsers.filter((u) => u.id !== currentUserId);
    //             if (others.length === 0) return prev;
    //             const who = pick(others);
    //             const now = Date.now();
    //
    //             const currentKey = getCurrentDoingKey(who.id, prev, doingTypes);
    //             const currentUd = getCurrentUserDoing(who.id, prev);
    //             const activeDoings = dbDoings.filter((d) => d.key !== "idle");
    //             if (activeDoings.length === 0) return prev;
    //             const newDoing = pick(activeDoings).key;
    //             if (newDoing === currentKey) return prev;
    //
    //             const newUserDoing = {
    //                 id: `ud-${who.id}-${now}-${Math.random().toString(16).slice(2)}`,
    //                 user_id: who.id,
    //                 doing_key: newDoing,
    //                 started_at: now,
    //             };
    //
    //             setDoingMessages((msgs) => {
    //                 const newMsgs = [];
    //                 if (currentUd) {
    //                     newMsgs.push({
    //                         id: `sys-${currentUd.id}-end-${now}`,
    //                         user_doing_id: currentUd.id,
    //                         author_user_id: who.id,
    //                         text: `${doingInfo(currentKey).label}を終了しました`,
    //                         created_at: now,
    //                         isSystem: true,
    //                     });
    //                 }
    //                 newMsgs.push({
    //                     id: `sys-${newUserDoing.id}-start-${now}`,
    //                     user_doing_id: newUserDoing.id,
    //                     author_user_id: who.id,
    //                     text: `${doingInfo(newDoing).label}を開始しました`,
    //                     created_at: now + 1,
    //                     isSystem: true,
    //                 });
    //                 newMsgs.push({
    //                     id: `m-${newUserDoing.id}-1`,
    //                     user_doing_id: newUserDoing.id,
    //                     author_user_id: who.id,
    //                     text: "はじめよ〜",
    //                     created_at: now + 2,
    //                 });
    //                 return [...msgs, ...newMsgs];
    //             });
    //
    //             setTimeline((tl) => {
    //                 const text = `${who.name}さんが ${doingInfo(newDoing).label} をしています`;
    //                 const item = {
    //                     id: `${who.id}-${now}-${Math.random()}`,
    //                     text,
    //                 };
    //                 return [...tl, item].slice(-20);
    //             });
    //
    //             return [newUserDoing, ...prev].slice(0, 300);
    //         });
    //     }, 2500);
    //
    //     return () => clearInterval(t);
    // }, [dbUsers, dbDoings, currentUserId, doingTypes]);

    // -------------------------
    // 漂い（avatar_states更新）— doing別の動きプロファイルを適用
    // TODO: 将来的にはクリックした場所に移動できるようにする。自動漂いは廃止。
    // -------------------------
    // const usersViewRef = useRef(usersView);
    // usersViewRef.current = usersView;
    //
    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         setAvatarStates((prev) => {
    //             const el = plazaRef.current;
    //             if (!el) return prev;
    //
    //             const rect = el.getBoundingClientRect();
    //             const minX = 28;
    //             const minY = 28;
    //             const maxX = Math.max(minX + 1, rect.width - 28);
    //             const maxY = Math.max(minY + 1, rect.height - 28);
    //
    //             const currentUsersView = usersViewRef.current;
    //
    //             return prev.map((a) => {
    //                 const uv = currentUsersView.find((u) => u.id === a.user_id);
    //                 const di = uv
    //                     ? doingInfo(uv.currentDoing)
    //                     : (doingTypes[0] ?? {
    //                           moveChance: 0,
    //                           moveDistance: 0,
    //                       });
    //
    //                 const moveChance = di.moveChance ?? 1.0;
    //                 const moveDistance = di.moveDistance ?? 18;
    //                 const selectBias =
    //                     a.user_id === selectedUserId ? 0.25 : 1.0;
    //
    //                 if (Math.random() > moveChance) return a;
    //
    //                 const dx =
    //                     (Math.random() - 0.5) * moveDistance * selectBias;
    //                 const dy =
    //                     (Math.random() - 0.5) * moveDistance * selectBias;
    //                 return {
    //                     ...a,
    //                     x: clamp(a.x + dx, minX, maxX),
    //                     y: clamp(a.y + dy, minY, maxY),
    //                 };
    //             });
    //         });
    //     }, 1000);
    //
    //     return () => clearInterval(interval);
    // }, [selectedUserId, doingTypes]);

    return (
        <div className="top_page_section page_section">
            {/* Topic overlay */}
            {topicOverlay && (
                <div className="top_topic_overlay_wrap topic_overlay_wrap">
                    <div className="top_topic_overlay topic_overlay">
                        <div className="top_topic_overlay_title topic_overlay_title">
                            🔔 今日のテーマ
                        </div>
                        <div className="top_topic_overlay_title2 topic_overlay_title">
                            {topicOverlay.title}
                        </div>
                        {topicOverlay.desc ? (
                            <div className="top_topic_overlay_desc topic_overlay_desc">
                                {topicOverlay.desc}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Top bar */}
            <div className="top_topbar">
                <div className="top_brand">
                    <div className="top_brand_title">zatsudan</div>
                    <div className="top_brand_sub">
                        いるだけ広場（MVP / 自分操作あり）
                    </div>
                </div>

                <div className="top_topbar_btns">
                    <button
                        className="top_my_btn"
                        onClick={openMyPanel}
                        title="自分を開く"
                    >
                        My
                    </button>
                </div>
            </div>

            {/* Main */}
            <div className="top_main">
                {/* Plaza */}
                <div ref={plazaRef} className="top_plaza">
                    <div className="top_plaza_bg" />

                    {/* dots */}
                    {usersView.map((u) => {
                        const d = doingInfo(u.currentDoing);
                        const isSelected = u.id === selectedUserId;

                        return (
                            <button
                                key={u.id}
                                className={`top_plaza_dot_btn${isSelected ? " top_plaza_dot_btn--selected" : ""}`}
                                onClick={() => onClickDot(u.id)}
                                title={`${u.name} / ${d.label}`}
                                style={{ left: u.pos.x, top: u.pos.y }}
                            >
                                <span
                                    className="top_plaza_dot_core"
                                    style={{
                                        backgroundImage:
                                            'url("/images/avatar/test.png")',
                                        animation: d.cssAnim || "none",
                                    }}
                                />
                                <span className="top_plaza_dot_label">
                                    {d.emoji ? `${d.emoji} ` : ""}
                                    {u.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right drawer (右サイド：ここに統一) */}
                <div className="top_drawer">
                    {/* ヘッダー */}
                    <div className="top_drawer_header">
                        {selectedUser ? (
                            <div className="top_drawer_header_row">
                                <div className="top_drawer_header_name">
                                    {selectedUser.name}
                                </div>
                                <button
                                    className="top_drawer_close_btn"
                                    onClick={() => setSelectedUserId(null)}
                                    title="閉じる"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div className="top_drawer_header_title">
                                みんなたち
                            </div>
                        )}
                    </div>

                    {/* 中身 */}
                    <div className="top_drawer_body">
                        {/* ===== Topic + Radio (always visible) ===== */}
                        <div className="top_drawer_topic_radio">
                            {/* Radio mini */}
                            <div className="top_drawer_radio_mini">
                                <div className="top_drawer_radio_info">
                                    <div className="top_drawer_radio_label">
                                        📻 Radio
                                    </div>
                                    <div className="top_drawer_radio_track">
                                        ♪ {radioTrack.title} —{" "}
                                        {radioTrack.artist}
                                    </div>
                                </div>

                                <div className="top_drawer_radio_ctrls">
                                    <button
                                        className={`top_drawer_radio_onoff_btn${radioOn ? " top_drawer_radio_onoff_btn--on" : ""}`}
                                        onClick={() => setRadioOn((v) => !v)}
                                        title="（mock）いまは音は鳴らさずUIだけ"
                                    >
                                        {radioOn ? "ON" : "OFF"}
                                    </button>

                                    <input
                                        className="top_drawer_radio_volume"
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
                                        title={`Volume: ${Math.round(radioVolume * 100)}%`}
                                    />
                                </div>
                            </div>

                            {/* Topic button */}
                            <button
                                className="top_drawer_topic_btn"
                                onClick={() => setIsTopicPanelOpen((v) => !v)}
                            >
                                <div className="top_drawer_topic_btn_row">
                                    <div className="top_drawer_topic_info">
                                        <div className="top_drawer_topic_label">
                                            🔔 今のテーマ
                                        </div>
                                        <div className="top_drawer_topic_title">
                                            {currentTopic.title}
                                        </div>
                                    </div>
                                    <div className="top_drawer_topic_arrow">
                                        {isTopicPanelOpen ? "▲" : "▼"}
                                    </div>
                                </div>

                                {currentTopic.desc ? (
                                    <div className="top_drawer_topic_desc">
                                        {currentTopic.desc}
                                    </div>
                                ) : null}
                            </button>

                            {/* Topic panel */}
                            {isTopicPanelOpen && (
                                <div className="top_drawer_topic_panel">
                                    <div className="top_drawer_topic_panel_label">
                                        💬 テーマへのコメント
                                    </div>

                                    {/* コメント一覧（doingの見た目を流用） */}
                                    <div className="top_drawer_topic_panel_comments">
                                        {currentTopicComments.length === 0 ? (
                                            <div className="top_drawer_topic_panel_no_comment">
                                                （まだコメントなし）
                                            </div>
                                        ) : (
                                            currentTopicComments.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className={`top_drawer_topic_panel_comment_row${m.authorUserId === currentUserId ? " top_drawer_topic_panel_comment_row--right" : ""}`}
                                                >
                                                    <div
                                                        className={`top_drawer_topic_panel_comment_bubble${m.authorUserId === currentUserId ? " top_drawer_topic_panel_comment_bubble--right" : ""}`}
                                                        title={m.authorName}
                                                    >
                                                        {m.text}
                                                        {m.authorUserId !==
                                                            currentUserId && (
                                                            <button
                                                                className="top_drawer_topic_panel_comment_user_btn"
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
                                    {currentUserId ? (
                                        <div className="top_drawer_topic_panel_input_row">
                                            <textarea
                                                className="top_drawer_topic_panel_input"
                                                value={topicComment}
                                                onChange={(e) =>
                                                    setTopicComment(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={
                                                    onTopicCommentKeyDown
                                                }
                                                placeholder="テーマにひとこと（Enterで送信 / Shift+Enterで改行）"
                                                rows={2}
                                            />
                                            <button
                                                className="top_drawer_topic_panel_send_btn"
                                                onClick={submitTopicComment}
                                            >
                                                送信
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="top_drawer_topic_panel_login_msg">
                                            コメントするにはログインしてください
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedUser ? (
                            <div className="top_drawer_detail_overlay">
                                {/* 自分操作 */}
                                {isSelectedMe && (
                                    <div className="top_my_controls">
                                        <div className="top_my_controls_label">
                                            Doing切り替え
                                        </div>

                                        <div className="top_my_doing_grid">
                                            {dbDoings
                                                .filter((d) => d.key !== "idle")
                                                .map((d) => {
                                                    const active =
                                                        d.key ===
                                                        selectedUser.currentDoing;
                                                    return (
                                                        <button
                                                            key={d.key}
                                                            className={`top_my_doing_chip${active ? " top_my_doing_chip--active" : ""}`}
                                                            onClick={() =>
                                                                setMyDoing(
                                                                    d.key,
                                                                )
                                                            }
                                                            title={d.label}
                                                        >
                                                            {d.emoji} {d.label}
                                                        </button>
                                                    );
                                                })}
                                        </div>

                                        <button
                                            className="top_my_doing_stop_btn"
                                            onClick={() => setMyDoing("idle")}
                                            title="Doingを終了する"
                                        >
                                            終了する
                                        </button>

                                        <div className="top_my_comment_row">
                                            <textarea
                                                className="top_my_comment_input"
                                                value={myComment}
                                                onChange={(e) =>
                                                    setMyComment(e.target.value)
                                                }
                                                onKeyDown={onMyCommentKeyDown}
                                                placeholder="いまのdoingにコメント（Enterで送信 / Shift+Enterで改行）"
                                                rows={2}
                                            />
                                            <button
                                                className="top_my_comment_send_btn"
                                                onClick={submitMyComment}
                                            >
                                                送信
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 他人にコメント */}
                                {!isSelectedMe && currentUserId && (
                                    <div className="top_other_comment_controls">
                                        <div
                                            className="top_other_comment_label"
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

                                        <div className="top_other_comment_row">
                                            <textarea
                                                className="top_other_comment_input"
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
                                                rows={2}
                                            />
                                            <button
                                                className="top_other_comment_send_btn"
                                                onClick={
                                                    submitCommentToOtherUser
                                                }
                                            >
                                                送信
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* logs */}
                                <div className="top_drawer_logs">
                                    {selectedUser.logs.map((log, logIdx) => {
                                        const di = doingInfo(log.doingKey);
                                        const isCurrent = logIdx === 0;
                                        return (
                                            <div
                                                key={log.doingKey}
                                                className="top_drawer_log_block"
                                            >
                                                <div className="top_drawer_log_heading">
                                                    <span
                                                        className="top_drawer_log_emoji"
                                                        style={{
                                                            marginRight: 8,
                                                        }}
                                                    >
                                                        {di.emoji}
                                                    </span>
                                                    <span
                                                        className="top_drawer_log_label"
                                                        style={{
                                                            fontWeight: 800,
                                                        }}
                                                    >
                                                        {di.label}
                                                    </span>
                                                    <span className="top_drawer_log_time">
                                                        {formatDoingStartTime(
                                                            log.startedAt,
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="top_drawer_log_msg_list">
                                                    {log.messages.length ===
                                                    0 ? (
                                                        <div className="top_drawer_log_msg_hint">
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
                                                                        className="top_drawer_log_system_msg"
                                                                    >
                                                                        {m.text}
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="top_drawer_log_msg_row"
                                                                    >
                                                                        <div className="top_drawer_log_msg_bubble">
                                                                            {
                                                                                m.text
                                                                            }
                                                                            {m.side ===
                                                                                "other" && (
                                                                                <button
                                                                                    className="top_drawer_log_msg_user_btn"
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
                            <div className="top_drawer_list">
                                {usersView.map((u) => {
                                    const d = doingInfo(u.currentDoing);
                                    return (
                                        <button
                                            key={u.id}
                                            className="top_drawer_user_row"
                                            onClick={() =>
                                                onPickUserFromMenu(u.id)
                                            }
                                        >
                                            <span
                                                className="top_drawer_user_dot"
                                                style={{
                                                    background: d.color,
                                                }}
                                            />
                                            <span className="top_drawer_user_name">
                                                {u.name}
                                            </span>
                                            <span className="top_drawer_user_doing">
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
            <div className="top_timeline">
                <div className="top_timeline_label">Timeline</div>

                <div className="top_timeline_marquee_wrap">
                    <div className="top_timeline_marquee_inner">
                        {[...timeline, ...timeline].map((t, i) => (
                            <span
                                key={`${t.id}-${i}`}
                                className="top_timeline_item"
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
