import React, { useEffect, useMemo, useRef, useState } from "react";
import { styles } from "./Top.styles";

/**
 * MVP: 15点 / 右サイドメニュー(普段は閉) / 下タイムライン
 * DB設計っぽい「テーブル構造（mock）」から状態を合成して描画する版
 *
 * 追加:
 * - 自分（currentUserId）の doing 切り替え
 * - 自分の最新 doing へコメント投稿
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

const BG_GRADIENT =
  "radial-gradient(1200px 800px at 20% 10%, rgba(59,130,246,0.04), transparent 60%)," +
  "radial-gradient(900px 700px at 90% 20%, rgba(236,72,153,0.03), transparent 55%)," +
  "radial-gradient(900px 700px at 65% 90%, rgba(16,185,129,0.03), transparent 55%)," +
  "linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 55%, #FAFAFA 100%)";

// =========================
// Utils
// =========================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function doingInfo(key) {
  return DOINGS.find((d) => d.key === key) ?? DOINGS[0];
}

// 点の初期配置（重なりにくく）
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

    doing_messages.push(
      {
        id: `m-${ud1.id}-1`,
        user_doing_id: ud1.id,
        side: "self",
        text: "この問題むずい！",
        created_at: now - 1000 * 10,
      },
      {
        id: `m-${ud1.id}-2`,
        user_doing_id: ud1.id,
        side: "self",
        text: "とけた〜",
        created_at: now - 1000 * 6,
      },
      {
        id: `m-${ud1.id}-3`,
        user_doing_id: ud1.id,
        side: "other",
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
function getCurrentUserDoing(userId, userDoings) {
  let best = null;
  for (const ud of userDoings) {
    if (ud.user_id !== userId) continue;
    if (!best || ud.started_at > best.started_at) best = ud;
  }
  return best;
}
function getCurrentDoingKey(userId, userDoings) {
  return getCurrentUserDoing(userId, userDoings)?.doing_key ?? DOINGS[0].key;
}

export default function Top() {
  const plazaRef = useRef(null);

  // ---- mock DB state ----
  const [dbUsers] = useState(() => USERS);
  const [dbDoings] = useState(() => DOINGS);

  const [{ user_doings: initialUserDoings, doing_messages: initialMessages }] =
    useState(() => buildInitialUserDoingsAndMessages());

  const [userDoings, setUserDoings] = useState(() => initialUserDoings);
  const [doingMessages, setDoingMessages] = useState(() => initialMessages);
  const [avatarStates, setAvatarStates] = useState(() =>
    buildInitialAvatarStates(USERS.map((u) => u.id)),
  );

  // UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // 自分操作用UI state
  const [myComment, setMyComment] = useState("");

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
        .map((m) => ({ side: m.side, text: m.text }));

      blocks.push({
        doingKey: ud.doing_key,
        userDoingId: ud.id,
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
  const onClickDot = (id) => {
    setSelectedUserId(id);
    setMenuOpen(false);
  };
  const onPickUserFromMenu = (id) => setSelectedUserId(id);

  // Myボタン：いつでも自分の詳細を開く
  const openMyPanel = () => {
    setSelectedUserId(CURRENT_USER_ID);
    setMenuOpen(false);
  };

  // ---- 自分の doing 切り替え（user_doingsにINSERT） ----
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

  // ---- 自分の最新doingへコメント（doing_messagesにINSERT） ----
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
        side: "self",
        text,
        created_at: now,
      },
    ]);

    setMyComment("");
  };

  // Enterで送信
  const onMyCommentKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMyComment();
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
        let newDoing = pick(dbDoings).key;
        if (newDoing === currentKey) return prev;

        const newUserDoing = {
          id: `ud-${who.id}-${now}-${Math.random().toString(16).slice(2)}`,
          user_id: who.id,
          doing_key: newDoing,
          started_at: now,
        };

        setDoingMessages((msgs) => [
          ...msgs,
          {
            id: `m-${newUserDoing.id}-1`,
            user_doing_id: newUserDoing.id,
            side: "self",
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
          <div style={styles.brandSub}>いるだけ広場（MVP / 自分操作あり）</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={styles.myBtn} onClick={openMyPanel} title="自分を開く">
            My
          </button>
          <button style={styles.menuBtn} onClick={() => setMenuOpen((v) => !v)}>
            Menu
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
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${d.color} 55%, rgba(0,0,0,0.15) 120%)`,
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
                    {doingInfo(selectedUser.currentDoing).emoji}{" "}
                    {doingInfo(selectedUser.currentDoing).label}
                  </span>
                  {isSelectedMe && <span style={styles.meTag}>自分</span>}
                </div>
                <button
                  style={styles.closeBtn}
                  onClick={() => setSelectedUserId(null)}
                >
                  ×
                </button>
              </div>

              {/* 自分操作: doing切り替え */}
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
                      const active = d.key === selectedUser.currentDoing;
                      return (
                        <button
                          key={d.key}
                          onClick={() => setMyDoing(d.key)}
                          style={{
                            ...styles.doingChip,
                            borderColor: active
                              ? "rgba(0,0,0,0.22)"
                              : "rgba(0,0,0,0.10)",
                            background: active ? "rgba(0,0,0,0.04)" : "#FFFFFF",
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
                      onChange={(e) => setMyComment(e.target.value)}
                      onKeyDown={onMyCommentKeyDown}
                      placeholder="いまのdoingにコメント（Enterで送信 / Shift+Enterで改行）"
                      style={styles.myTextarea}
                      rows={2}
                    />
                    <button style={styles.sendBtn} onClick={submitMyComment}>
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
                    <div key={log.doingKey} style={styles.logBlock}>
                      <div style={styles.logHeading}>
                        <span style={{ marginRight: 8 }}>{di.emoji}</span>
                        <span style={{ fontWeight: 800 }}>{di.label}</span>
                      </div>

                      <div style={styles.msgList}>
                        {log.messages.length === 0 ? (
                          <div style={styles.msgHint}>（まだコメントなし）</div>
                        ) : (
                          log.messages.map((m, idx) => (
                            <div
                              key={idx}
                              style={{
                                ...styles.msgRow,
                                justifyContent:
                                  m.side === "other"
                                    ? "flex-end"
                                    : "flex-start",
                              }}
                            >
                              <div
                                style={{
                                  ...styles.msgBubble,
                                  background:
                                    m.side === "other" ? "#4A90E2" : "#F0F0F0",
                                  borderColor:
                                    m.side === "other"
                                      ? "#4A90E2"
                                      : "rgba(0,0,0,0.10)",
                                  color:
                                    m.side === "other" ? "#FFFFFF" : "#333",
                                }}
                              >
                                {m.text}
                                {m.side === "other" && (
                                  <span style={styles.otherTag}>他人</span>
                                )}
                              </div>
                            </div>
                          ))
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
        <div
          style={{
            ...styles.drawer,
            transform: menuOpen ? "translateX(0)" : "translateX(110%)",
          }}
        >
          <div style={styles.drawerHeader}>
            <div style={{ fontWeight: 900 }}>Menu</div>
            <button style={styles.closeBtn} onClick={() => setMenuOpen(false)}>
              ×
            </button>
          </div>

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
                  <span style={styles.userName}>{u.name}</span>
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
              <span key={`${t.id}-${i}`} style={styles.timelineItem}>
                {t.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
