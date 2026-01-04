// resources/js/Pages/Top.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head,router } from "@inertiajs/react";
// import { Inertia } from "@inertiajs/inertia";
import ModalBase from "../Components/ModalBase.jsx";

// 6択アバター（絵文字で仮）
const AVATARS = ["🙂", "😎", "🥸", "🐶", "🐱", "🦊"];
const GENDERS = [
  { value: "unknown", label: "未選択" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
];
const AGES = [
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s+", label: "60代+" },
];

const THEME_KEY = "zatsudan_theme";


function shiftDay(yyyymmdd, diff) {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  const date = new Date(y, m, d);
  date.setDate(date.getDate() + diff);

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}


/**
 * n を min〜max の範囲に収める
 */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * min〜max の間の整数をランダムで返す
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 配列からランダムに1つ選ぶ
 */
function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

function makeMockComments() {
  return [
    {
      id: 1,
      body: "最近うまいラーメン屋見つけた…でも店名忘れたw",
      gender: "male",
      age: "30s",
      avatar: "😎",
    },
    {
      id: 2,
      body: "年末の空気、ちょっと好き。静かで。",
      gender: "female",
      age: "20s",
      avatar: "🙂",
    },
    {
      id: 3,
      body: "仕事の合間のコーヒーが一番うまい説ある。",
      gender: "unknown",
      age: "40s",
      avatar: "🥸",
    },
    {
      id: 4,
      body: "ホゲホゲ。",
      gender: "unknown",
      age: "40s",
      avatar: "🥸",
    },
    {
      id: 5,
      body: "ふぎゃふぎゃ",
      gender: "unknown",
      age: "40s",
      avatar: "🥸",
    },
  ];
}

/**
 * 人（バブル）の初期位置生成
 * 画面サイズに依存しない相対座標（%）で管理
 */
function spawnPerson(baseComment) {
  const now = Date.now();
  return {
    key: crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`,
    comment: baseComment,
    x: randInt(10, 90), // %
    y: randInt(25, 85), // %
    size: randInt(54, 72), // px
    drift: randInt(-10, 10), // ふわっと横揺れ用
    bornAt: Date.now(),
    nextMoveAt: now + randInt(1000, 5000), // 1〜5秒後
  };
}

/**
 * 画面上に浮かぶ「人（発言者）」の見た目コンポーネント
 * 動的な値（left/top/sizeなど）だけ inline に残す
 */
function PersonBubble({ person, onClick }) {
  const { comment, x, y, size, drift } = person;

  return (
    <button
      type="button"
      onClick={() => onClick(person)}
      className="person"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        animationDelay: `${randInt(0, 800)}ms`,
      }}
      aria-label="person bubble"
      title="クリックで発言を見る"
    >
      <span
        className="personInner"
        style={{
          fontSize: Math.floor(size * 0.42),
          transform: `translateX(${drift}px)`,
        }}
      >
        {comment.avatar}
      </span>
    </button>
  );
}

export default function Top(props) {
  // サーバーから受け取る形に寄せる（今はモックでOK）
  const todayTheme = props?.todayTheme ?? {
    id: 1,
    body: "さいきん「いいな」と思った小さなこと😊",
  };
  const todayFormatted = props?.todayFormatted ?? "";

  const currentDay = props.day; 


  const mockComments = useMemo(() => {
    const base = props?.comments?.length ? props.comments : makeMockComments();
    return base.map((c, i) => ({
      id: c.id ?? i + 1,
      body: c.body ?? "",
      gender: c.gender ?? "unknown",
      age: c.age ?? "20s",
      avatar: c.avatar ?? pickOne(AVATARS),
    }));
  }, [props?.comments]);

  // テーマ切替（dark / light）
  const [theme, setTheme] = useState(() => getInitialTheme());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  // 表示中の人たち（初期：全員表示）
  const [people, setPeople] = useState(() => mockComments.map((c) => spawnPerson(c)));

  // 自動一言
  const [autoSpeak, setAutoSpeak] = useState(null);

  // ポップアップ（人をクリック）
  const [selected, setSelected] = useState(null);

  // 投稿モーダル
  const [postOpen, setPostOpen] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [postGender, setPostGender] = useState("unknown");
  const [postAge, setPostAge] = useState("20s");
  const [postAvatar, setPostAvatar] = useState(AVATARS[0]);

  // 自動発言制御
  const autoSpeakTimerRef = useRef(null);
  useEffect(() => {
    let cancelled = false;

    function clearTimer() {
      if (autoSpeakTimerRef.current) {
        clearTimeout(autoSpeakTimerRef.current);
        autoSpeakTimerRef.current = null;
      }
    }

    function loop() {
      if (cancelled) return;

      // 人がいなければ少し待って再トライ
      if (!people.length) {
        autoSpeakTimerRef.current = setTimeout(loop, 2000);
        return;
      }

      // クリックでモーダル開いてる時は自動発言を控える
      if (selected) {
        autoSpeakTimerRef.current = setTimeout(loop, 2000);
        return;
      }

      // ランダムに1人選ぶ
      const p = pickOne(people);

      // 吹き出し表示（10秒）
      setAutoSpeak({
        key: crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`,
        personKey: p.key,
        body: p.comment.body,
      });

      // 10秒表示 → 消す → 少し間を置いて次
      autoSpeakTimerRef.current = setTimeout(() => {
        setAutoSpeak(null);

        autoSpeakTimerRef.current = setTimeout(() => {
          loop();
        }, randInt(2000, 4000));
      }, 10000);
    }

    clearTimer();
    loop();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [people, selected]);

  // 「ふわっと出たり消えたり」制御
  const tickRef = useRef(null);
  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setPeople((prev) => {
        const now = Date.now();

        return prev.map((p) => {
          if (now < p.nextMoveAt) return p;

          const dx = randInt(-3, 3);
          const dy = randInt(-3, 3);

          return {
            ...p,
            x: clamp(p.x + dx, 10, 90),
            y: clamp(p.y + dy, 25, 88),
            nextMoveAt: now + randInt(1000, 5000),
          };
        });
      });
    }, randInt(3200, 5200));

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [mockComments]);

  function openPerson(person) {
    setSelected(person);
  }

  function closePerson() {
    setSelected(null);
  }

  function submitPost(e) {
    e.preventDefault();

    const newComment = {
      id: Date.now(),
      body: postBody.trim(),
      gender: postGender,
      age: postAge,
      avatar: postAvatar,
    };

    if (!newComment.body) return;

    setPeople((prev) => {
      const max = 3;
      const next = [spawnPerson(newComment), ...prev];
      return next.slice(0, max);
    });

    setPostBody("");
    setPostGender("unknown");
    setPostAge("20s");
    setPostAvatar(AVATARS[0]);
    setPostOpen(false);
  }

  return (
    <>
      <Head title="雑談" />

      <div className="page">
        <div className="container">
          {/* Header */}
          <div className="headerRow">
            <div className="brand">
              <div className="brandTitle">zatsudan</div>
              <div className="brandSub">日々の作業のお供に</div>
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn btnSm"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                aria-label="toggle theme"
                title="テーマ切替"
              >
                {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
              </button>

              <button type="button" className="btn" onClick={() => setPostOpen(true)}>
                投稿する
              </button>
            </div>
          </div>

          {/* 今日のお題 */}
          <div className="card">
            <div className="cardMeta">Today’s theme | {todayFormatted}</div>
            <div className="cardTitle">今日のお題：{todayTheme.body}</div>
            <div className="cardHint">人をクリックすると、コメントが見られるよ😊</div>

			<div style={{ display: "flex", gap: 10, marginTop: 12 }}>
				<button
					className="btn btnSm"
					onClick={() => {
						router.get("/", { day: shiftDay(currentDay, -1) });
					}}
				>
					← 前の日
				</button>

				<button
					className="btn btnSm"
					onClick={() => {
						router.get("/", { day: shiftDay(currentDay, 1) });
					}}
				>
					次の日 →
				</button>
			</div>

          </div>

          {/* メイン表示領域（人が浮かぶ） */}
          <div className="stage">
            <div className="stageGrain" />

            {/* 人たち */}
            {people.map((p) => (
              <PersonBubble key={p.key} person={p} onClick={openPerson} />
            ))}

            {/* 自動発言の吹き出し */}
            {autoSpeak &&
              (() => {
                const p = people.find((x) => x.key === autoSpeak.personKey);
                if (!p) return null;

                return (
                  <div
                    key={autoSpeak.key}
                    className="speech"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                    }}
                  >
                    {autoSpeak.body}
                  </div>
                );
              })()}
          </div>
        </div>

        {/* 発言ポップアップ */}
        <ModalBase open={!!selected} onClose={closePerson} title="ひとこと">
          {selected && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 22,
                  }}
                >
                  {selected.comment.avatar}
                </div>
                <div style={{ display: "grid" }}>
                  <div style={{ fontWeight: 800 }}>
                    {GENDERS.find((g) => g.value === selected.comment.gender)?.label ?? "未選択"}
                    {" / "}
                    {AGES.find((a) => a.value === selected.comment.age)?.label ?? "年代不明"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>（匿名）</div>
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  lineHeight: 1.6,
                }}
              >
                {selected.comment.body}
              </div>
            </div>
          )}
        </ModalBase>

        {/* 投稿モーダル */}
        <ModalBase open={postOpen} onClose={() => setPostOpen(false)} title="投稿する">
          <form onSubmit={submitPost} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, opacity: 0.75 }}>ひとこと</div>
              <textarea
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                rows={4}
                placeholder="話題にコメントする"
                style={{
                  width: "100%",
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <div style={{ fontSize: 12, opacity: 0.55 }}>※ あとでDB保存に切り替えられるよ（今はUIだけ）</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 13, opacity: 0.75 }}>性別</div>
                <select
                  value={postGender}
                  onChange={(e) => setPostGender(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.92)",
                    outline: "none",
                  }}
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value} style={{ color: "#111" }}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 13, opacity: 0.75 }}>年代</div>
                <select
                  value={postAge}
                  onChange={(e) => setPostAge(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.92)",
                    outline: "none",
                  }}
                >
                  {AGES.map((a) => (
                    <option key={a.value} value={a.value} style={{ color: "#111" }}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, opacity: 0.75 }}>アバター（6択）</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {AVATARS.map((a) => {
                  const active = postAvatar === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setPostAvatar(a)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        border: active
                          ? "1px solid rgba(255,255,255,0.65)"
                          : "1px solid rgba(255,255,255,0.18)",
                        background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
                        cursor: "pointer",
                        fontSize: 22,
                        boxShadow: active ? "0 10px 30px rgba(0,0,0,0.5)" : "none",
                      }}
                      aria-label={`avatar ${a}`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setPostOpen(false)}
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.95)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!postBody.trim()}
                style={{
                  border: "1px solid rgba(255,255,255,0.20)",
                  background: postBody.trim() ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.95)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  cursor: postBody.trim() ? "pointer" : "not-allowed",
                }}
              >
                送信
              </button>
            </div>
          </form>
        </ModalBase>
      </div>
    </>
  );
}
