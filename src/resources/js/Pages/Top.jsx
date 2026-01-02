// resources/js/Pages/Top.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head } from "@inertiajs/react";
import ModalBase from "../Components/ModalBase.jsx";

<style>{`
  @keyframes fadePop {
    from { opacity: 0; transform: translate(-50%, calc(-100% - 10px)) scale(0.98); }
    to   { opacity: 1; transform: translate(-50%, calc(-100% - 14px)) scale(1); }
  }
`}</style>

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

/**
 * 
 * n を min〜max の範囲に収める
 * ランダム移動などで 画面外に飛び出さないように制限
 * 人の位置（x, y）を調整し、被らないように安全に保つためのガード役
 */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}


/**
 * 
* min〜max の間の整数をランダムで返す
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * 
 * 配列からランダムに1つ選ぶ
 * 「どの人が出るか」を毎回変えるための抽選係
 */
function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeMockComments() {
  // “2〜3コメント”の雰囲気
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
 * 
 * 画面上に浮かぶ「人（発言者）」の見た目コンポーネント
 */
function PersonBubble({ person, onClick }) {
  const { comment, x, y, size, drift } = person;

  return (
	<button
	  type="button"
	  onClick={() => onClick(person)}
	  style={{
		position: "absolute",
		left: `${x}%`,
		top: `${y}%`,
		transform: `translate(-50%, -50%)`,
		transition: "left 0.8s ease, top 0.8s ease",
		width: size,
		height: size,
		borderRadius: 999,
		border: "1px solid rgba(255,255,255,0.35)",
		background: "rgba(255,255,255,0.08)",
		backdropFilter: "blur(8px)",
		cursor: "pointer",
		boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
		animation: `floaty 3.2s ease-in-out infinite`,
		// 個体差
		animationDelay: `${randInt(0, 800)}ms`,
	  }}
	  aria-label="person bubble"
	  title="クリックで発言を見る"
	>
	  <span
		style={{
		  display: "grid",
		  placeItems: "center",
		  width: "100%",
		  height: "100%",
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
	body: "今日のわだい：さいきん「いいな」と思った小さなこと😊",
  };
  const todayFormatted = props?.todayFormatted;

  const mockComments = useMemo(() => {
	// props.comments が来たら差し替えるだけでOK
	const base = props?.comments?.length ? props.comments : makeMockComments();
	return base.map((c, i) => ({
	  id: c.id ?? i + 1,
	  body: c.body ?? "",
	  gender: c.gender ?? "unknown",
	  age: c.age ?? "20s",
	  avatar: c.avatar ?? pickOne(AVATARS),
	}));
  }, [props?.comments]);

  // 表示中の人たち
  const [people, setPeople] = useState(() => {
	// 初期は2人くらい
	return [spawnPerson(mockComments[0]), spawnPerson(mockComments[1])].filter(Boolean);
  });

  // 自動一言
  const [autoSpeak, setAutoSpeak] = useState(null);

  // ポップアップ（人をクリック）
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);

  // 投稿モーダル
  const [postOpen, setPostOpen] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [postGender, setPostGender] = useState("unknown");
  const [postAge, setPostAge] = useState("20s");
  const [postAvatar, setPostAvatar] = useState(AVATARS[0]);
  
  //自動発言制御
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

		// クリックでモーダル開いてる時は自動発言を控える（任意）
		if (selected) {
		autoSpeakTimerRef.current = setTimeout(loop, 2000);
		return;
		}

		// ランダムに1人選ぶ（今いるpeopleから）
		const p = pickOne(people);

		// 吹き出し表示（10秒）
		setAutoSpeak({
		key: crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`,
		personKey: p.key,
		body: p.comment.body,
		});

		// 10秒表示 → 消す → 少し間を置いて次（例: 2〜4秒）
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
	// people が変わるたびにループを再構築（位置や人数が変わるので）
	// 
}, [people, selected]);



  // 「ふわっと出たり消えたり」制御
  const tickRef = useRef(null);
  useEffect(() => {
	// 3〜5秒おきに更新：ランダムで入れ替え
	tickRef.current = window.setInterval(() => {
		setPeople((prev) => {
			const now = Date.now();

			return prev.map((p) => {
				if (now < p.nextMoveAt) {
					// まだ動く時間じゃない
					return p;
				}

				// 数ピクセルだけランダム移動
				const dx = randInt(-3, 3);
				const dy = randInt(-3, 3);

				return {
				...p,
				x: clamp(p.x + dx, 10, 90),
				y: clamp(p.y + dy, 25, 88),

				// 次の移動はまた1〜5秒後
				nextMoveAt: now + randInt(1000, 5000),
				};
			});
		});   
	}, randInt(3200, 5200));

	return () => {
	  if (tickRef.current) window.clearInterval(tickRef.current);
	};
  }, [mockComments]);


  /**
   * 人（バブル）がクリックされたときに呼ばれる
   * 選択された人を state に保存
   * 発言ポップアップを表示するトリガーになる
   */
  function openPerson(person) {
	setSelected(person);
	setChecked(false);
  }

  /**
   * 発言ポップアップを閉じる
   */
  function closePerson() {
	setSelected(null);
	setChecked(false);
  }


  /**
   * 
   * 投稿モーダルの送信処理(現在はdbに保存せず、入力内容を元に新しい「人」を作成して画面に追加するだけ)
   */
  function submitPost(e) {
	e.preventDefault();

	// まずはモック：保存せずUIだけ増やす（体験優先）
	const newComment = {
	  id: Date.now(),
	  body: postBody.trim(),
	  gender: postGender,
	  age: postAge,
	  avatar: postAvatar,
	};

	if (!newComment.body) return;

	// 新しい人として出現させる（最大3の範囲で入れ替え）
	setPeople((prev) => {
	  const max = 3;
	  const next = [spawnPerson(newComment), ...prev];
	  return next.slice(0, max);
	});

	// 入力リセット
	setPostBody("");
	setPostGender("unknown");
	setPostAge("20s");
	setPostAvatar(AVATARS[0]);
	setPostOpen(false);

	// todo ここに Inertia.post を後で追加すればDB保存へ移行できる
	// console.log("POST", { todayTalkId: todayTalk.id, ...newComment });
  }

  return (
	<>
	  <Head title="雑談" />

	  {/* ページ全体 */}
	  <div
		style={{
		  minHeight: "100vh",
		  color: "rgba(255,255,255,0.92)",
		  background:
			"radial-gradient(1200px 600px at 20% 10%, rgba(120,85,255,0.35), transparent 60%)," +
			"radial-gradient(900px 500px at 85% 30%, rgba(0,200,255,0.22), transparent 65%)," +
			"linear-gradient(180deg, #0B0B10 0%, #0A0A0F 70%, #07070B 100%)",
		  padding: "18px 16px 40px",
		}}
	  >
		{/* ちょいロゴ */}
		<div style={{ maxWidth: 980, margin: "0 auto" }}>
		  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
			<div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
			  <div style={{ fontWeight: 900, letterSpacing: 0.4, fontSize: 18 }}>zatsudan</div>
			  <div style={{ opacity: 0.6, fontSize: 12 }}>日々の作業のお供に</div>
			</div>

			<button
			  type="button"
			  onClick={() => setPostOpen(true)}
			  style={{
				border: "1px solid rgba(255,255,255,0.18)",
				background: "rgba(255,255,255,0.06)",
				color: "rgba(255,255,255,0.95)",
				borderRadius: 14,
				padding: "10px 14px",
				cursor: "pointer",
				boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
			  }}
			>
			  投稿する
			</button>
		  </div>

		  {/* 今日のお題 */}
		  <div
			style={{
			  marginTop: 18,
			  borderRadius: 18,
			  padding: "14px 16px",
			  background: "rgba(255,255,255,0.06)",
			  border: "1px solid rgba(255,255,255,0.12)",
			  boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
			}}
		  >
			<div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>Today’s theme | {todayFormatted} </div>
			<div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>{todayTheme.body}</div>
			<div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
			  人をクリックすると、コメントが見られるよ😊
			</div>
		  </div>

		  {/* メイン表示領域（人が浮かぶ） */}
		  <div
			style={{
			  position: "relative",
			  marginTop: 16,
			  height: 460,
			  borderRadius: 22,
			  overflow: "hidden",
			  border: "1px solid rgba(255,255,255,0.10)",
			  background: "rgba(255,255,255,0.03)",
			  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03), 0 22px 60px rgba(0,0,0,0.35)",
			}}
		  >
			{/* ふわふわ粒 */}
			<div
			  style={{
				position: "absolute",
				inset: 0,
				background:
				  "radial-gradient(2px 2px at 15% 30%, rgba(255,255,255,0.25) 40%, transparent 41%)," +
				  "radial-gradient(2px 2px at 70% 55%, rgba(255,255,255,0.18) 40%, transparent 41%)," +
				  "radial-gradient(2px 2px at 35% 80%, rgba(255,255,255,0.12) 40%, transparent 41%)",
				opacity: 0.6,
			  }}
			/>

			{/* 人たち */}
			{people.map((p) => (
			  <PersonBubble key={p.key} person={p} onClick={openPerson} />
			))}

			{/* 自動発言の吹き出し */}
			{autoSpeak && (() => {
				const p = people.find(x => x.key === autoSpeak.personKey);
				if (!p) return null;

				return (
					<div
					key={autoSpeak.key}
					style={{
						position: "absolute",
						left: `${p.x}%`,
						top: `${p.y}%`,
						transform: "translate(-50%, calc(-100% - 14px))", // 人の上に出す
						maxWidth: 260,
						padding: "10px 12px",
						borderRadius: 14,
						background: "rgba(20,20,28,0.78)",
						border: "1px solid rgba(255,255,255,0.18)",
						boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
						backdropFilter: "blur(10px)",
						color: "rgba(255,255,255,0.92)",
						fontSize: 13,
						lineHeight: 1.5,
						pointerEvents: "none", // クリックの邪魔しない
						animation: "fadePop 220ms ease-out",
						zIndex: 5,
					}}
					>
					{autoSpeak.body}
					<div
						style={{
						position: "absolute",
						left: "50%",
						bottom: -8,
						transform: "translateX(-50%)",
						width: 14,
						height: 14,
						background: "rgba(20,20,28,0.78)",
						borderLeft: "1px solid rgba(255,255,255,0.18)",
						borderBottom: "1px solid rgba(255,255,255,0.18)",
						rotate: "45deg",
						}}
					/>
					</div>
				);
			})()}
		  </div>
		</div>

		{/* 発言ポップアップ */}
		<ModalBase
		  open={!!selected}
		  onClose={closePerson}
		  title="ひとこと"
		>
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

			  <label style={{ display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}>
				<input
				  type="checkbox"
				  checked={checked}
				  onChange={(e) => setChecked(e.target.checked)}
				/>
				<span style={{ fontSize: 13, opacity: 0.85 }}>
				  この発言、いいね（チェック）😊
				</span>
			  </label>

			  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
				<button
				  type="button"
				  onClick={closePerson}
				  style={{
					border: "1px solid rgba(255,255,255,0.18)",
					background: "rgba(255,255,255,0.06)",
					color: "rgba(255,255,255,0.95)",
					borderRadius: 12,
					padding: "10px 12px",
					cursor: "pointer",
				  }}
				>
				  戻る
				</button>
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
				placeholder="静かに、ひとこと…"
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
			  <div style={{ fontSize: 12, opacity: 0.55 }}>
				※ あとでDB保存に切り替えられるよ（今はUIだけ）
			  </div>
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

		{/* アニメーション */}
		<style>{`
		  @keyframes floaty {
			0% { transform: translate(-50%, -50%) translateY(0px); }
			50% { transform: translate(-50%, -50%) translateY(-10px); }
			100% { transform: translate(-50%, -50%) translateY(0px); }
		  }
		`}</style>
	  </div>
	</>
  );
}
