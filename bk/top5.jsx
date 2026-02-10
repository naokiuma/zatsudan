import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 *
 * 1ファイルで色々動いていたバージョン
 * MVP: 15点 / 右サイドメニュー(普段は閉) / 下タイムライン
 * DB設計っぽい「テーブル構造（mock）」から状態を合成して描画する版
 *
 * - users: ユーザー
 * - doings: doing マスタ
 * - user_doings: ユーザーの doing 履歴（＝現在doingもここから算出）
 * - doing_messages: doing見出し配下のコメント（self/other）
 * - avatar_states: 点の位置（将来 avatar_states テーブルに寄せやすい）
 */

// =========================
// Mock "DB tables"
// =========================

// doing マスタ（色だけで派手さ）
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
// UI look
// =========================
const BG_GRADIENT =
  "radial-gradient(1200px 800px at 20% 10%, rgba(59,130,246,0.04), transparent 60%)," +
  "radial-gradient(900px 700px at 90% 20%, rgba(236,72,153,0.03), transparent 55%)," +
  "radial-gradient(900px 700px at 65% 90%, rgba(16,185,129,0.03), transparent 55%)," +
  "linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 55%, #FAFAFA 100%)";

// =========================
// Small utils
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

  // avatar_states テーブルっぽい形
  return userIds.map((userId, idx) => ({
    user_id: userId,
    x: points[idx].x,
    y: points[idx].y,
  }));
}

// 初期 user_doings + doing_messages を「DBっぽく」作る
function buildInitialUserDoingsAndMessages() {
  const now = Date.now();

  // ユーザーごとに2つくらい doing 履歴を持たせる
  const user_doings = [];
  const doing_messages = [];

  USERS.forEach((u, i) => {
    const d1 = pick(DOINGS);
    const d2 = pick(DOINGS.filter((d) => d.key !== d1.key));

    // 最新 doing
    const ud1 = {
      id: `ud-${u.id}-a`,
      user_id: u.id,
      doing_key: d1.key,
      started_at: now - (i + 1) * 1000 * 30,
    };
    user_doings.push(ud1);

    // もう1個（過去）
    const ud2 = {
      id: `ud-${u.id}-b`,
      user_id: u.id,
      doing_key: d2.key,
      started_at: now - (i + 1) * 1000 * 60 * 20,
    };
    user_doings.push(ud2);

    // コメントは最新doingだけ少し入れておく（doing_messagesは user_doings に紐付ける想定）
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
// Main Component
// =========================
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

  // timeline state（これはeventテーブルにしてもOKだけど、とりあえずstate）
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
  // "selectors" (DB join)
  // -------------------------
  const usersView = useMemo(() => {
    // user => currentDoing + pos
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

    // logs: user_doings を started_at desc で並べ、doing_keyごとにまとめる（見出しはユニーク）
    // 「二回目以降も同じエリアに見出し」→ 同じdoing_keyが来たら、その塊を先頭に移動
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
        messages: msgs,
      });

      if (blocks.length >= 4) break; // UI上は最大4見出しくらい
    }

    return {
      id: user.id,
      name: user.name,
      currentDoing: currentDoingKey,
      logs: blocks,
    };
  }, [selectedUserId, dbUsers, userDoings, doingMessages]);

  // -------------------------
  // interactions
  // -------------------------
  const onClickDot = (id) => {
    setSelectedUserId(id);
    setMenuOpen(false);
  };

  const onPickUserFromMenu = (id) => {
    setSelectedUserId(id);
  };

  // -------------------------
  // "賑やかさ"：2.5秒ごとに誰かの doing を更新（＝user_doingsにINSERT）
  // -------------------------
  useEffect(() => {
    const t = setInterval(() => {
      setUserDoings((prev) => {
        const who = pick(dbUsers);
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

        // ついでにコメントも少し足す（本当は別API）
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

        // timelineへ（イベントテーブルにしても良い）
        setTimeline((tl) => {
          const text = `${who.name}さんが ${doingInfo(newDoing).label} をしています`;
          const item = {
            id: `${who.id}-${now}-${Math.random()}`,
            text,
          };
          return [...tl, item].slice(-20);
        });

        return [newUserDoing, ...prev].slice(0, 200); // 履歴が無限に増えないように上限
      });
    }, 2500);

    return () => clearInterval(t);
  }, [dbUsers, dbDoings]);

  // -------------------------
  // 点をふわっと漂わせる（avatar_states を更新するイメージ）
  // -------------------------
  // useEffect(() => {
  //     const interval = setInterval(() => {
  //         setAvatarStates((prev) => {
  //             const el = plazaRef.current;
  //             if (!el) return prev;

  //             const rect = el.getBoundingClientRect();
  //             const minX = 28;
  //             const minY = 28;
  //             const maxX = Math.max(minX + 1, rect.width - 28);
  //             const maxY = Math.max(minY + 1, rect.height - 28);

  //             return prev.map((a) => {
  //                 const bias = a.user_id === selectedUserId ? 0.25 : 1.0;
  //                 const dx = (Math.random() - 0.5) * 18 * bias;
  //                 const dy = (Math.random() - 0.5) * 18 * bias;
  //                 return {
  //                     ...a,
  //                     x: clamp(a.x + dx, minX, maxX),
  //                     y: clamp(a.y + dy, minY, maxY),
  //                 };
  //             });
  //         });
  //     }, 1000);

  //     return () => clearInterval(interval);
  // }, [selectedUserId]);

  // =========================
  // render
  // =========================
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
          <div style={styles.brandSub}>いるだけ広場（MVP / DBっぽいstate）</div>
        </div>

        <button style={styles.menuBtn} onClick={() => setMenuOpen((v) => !v)}>
          Menu
        </button>
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

// =========================
// Selectors helpers
// =========================
function getCurrentDoingKey(userId, userDoings) {
  let best = null;
  for (const ud of userDoings) {
    if (ud.user_id !== userId) continue;
    if (!best || ud.started_at > best.started_at) best = ud;
  }
  return best?.doing_key ?? DOINGS[0].key;
}

// =========================
// Styles (そのまま流用)
// =========================
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
  brandTitle: {
    fontWeight: 900,
    letterSpacing: 0.4,
    fontSize: 18,
    color: "#333",
  },
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
    width: 36,
    height: 36,
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

  msgRow: { display: "flex" },
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
  userName: {
    fontWeight: 900,
    fontSize: 13,
    flex: "0 0 auto",
    color: "#333",
  },
  userDoing: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: "auto",
    color: "#666",
  },

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
