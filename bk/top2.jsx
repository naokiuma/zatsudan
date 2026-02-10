import React, { useEffect, useMemo, useRef, useState } from "react";

// モックデータ
const MOCK_USERS = [
    { id: 1, name: "あなた", x: 200, y: 200, doing: "work", isYou: true },
    { id: 2, name: "さくら", x: 450, y: 180, doing: "read" },
    { id: 3, name: "けんた", x: 350, y: 350, doing: "game" },
    { id: 4, name: "ゆい", x: 600, y: 250, doing: "watch" },
    { id: 5, name: "たくみ", x: 150, y: 400, doing: "think" },
    { id: 6, name: "みお", x: 500, y: 450, doing: "bored" },
];

const DOING_CONTENT = {
    work: { emoji: "💻", label: "仕事中", color: "#4A90E2" },
    read: { emoji: "📚", label: "読書中", color: "#E8B55D" },
    game: { emoji: "🎮", label: "ゲーム中", color: "#E85D75" },
    watch: { emoji: "📺", label: "視聴中", color: "#9B59B6" },
    think: { emoji: "💭", label: "考え中", color: "#7FC8A9" },
    bored: { emoji: "😴", label: "ひまー", color: "#95A5A6" },
};

const ZatsudanSpace = () => {
    const canvasRef = useRef(null);
    const [users, setUsers] = useState(MOCK_USERS);
    const [selectedUser, setSelectedUser] = useState(null);
    const [visitHistory, setVisitHistory] = useState([]);
    const [keys, setKeys] = useState({});
    const animationFrameRef = useRef();

    // キーボード入力
    useEffect(() => {
        const handleKeyDown = (e) => {
            setKeys((prev) => ({ ...prev, [e.key]: true }));
        };
        const handleKeyUp = (e) => {
            setKeys((prev) => ({ ...prev, [e.key]: false }));
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    // プレイヤーの移動
    useEffect(() => {
        const movePlayer = () => {
            setUsers((prevUsers) => {
                const newUsers = [...prevUsers];
                const player = newUsers.find((u) => u.isYou);
                if (!player) return prevUsers;

                let moved = false;
                const speed = 3;

                if (keys["ArrowUp"] || keys["w"]) {
                    player.y = Math.max(50, player.y - speed);
                    moved = true;
                }
                if (keys["ArrowDown"] || keys["s"]) {
                    player.y = Math.min(550, player.y + speed);
                    moved = true;
                }
                if (keys["ArrowLeft"] || keys["a"]) {
                    player.x = Math.max(50, player.x - speed);
                    moved = true;
                }
                if (keys["ArrowRight"] || keys["d"]) {
                    player.x = Math.min(750, player.x + speed);
                    moved = true;
                }

                // 近くのユーザーを検出
                if (moved) {
                    newUsers.forEach((user) => {
                        if (user.isYou) return;
                        const distance = Math.sqrt(
                            Math.pow(player.x - user.x, 2) +
                                Math.pow(player.y - user.y, 2),
                        );
                        if (distance < 80) {
                            const existingVisit = visitHistory.find(
                                (v) =>
                                    v.userId === user.id &&
                                    Date.now() - v.timestamp < 3000,
                            );
                            if (!existingVisit) {
                                setVisitHistory((prev) => [
                                    ...prev,
                                    {
                                        userId: user.id,
                                        userName: user.name,
                                        doing: user.doing,
                                        timestamp: Date.now(),
                                    },
                                ]);
                            }
                        }
                    });
                }

                return moved ? newUsers : prevUsers;
            });

            animationFrameRef.current = requestAnimationFrame(movePlayer);
        };

        animationFrameRef.current = requestAnimationFrame(movePlayer);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [keys, visitHistory]);

    // Canvas描画
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animationId;

        const draw = () => {
            // 背景
            ctx.fillStyle = "#F5F1E8";
            ctx.fillRect(0, 0, 800, 600);

            // グリッド
            ctx.strokeStyle = "#E8DCC8";
            ctx.lineWidth = 1;
            for (let i = 0; i < 800; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 600);
                ctx.stroke();
            }
            for (let i = 0; i < 600; i += 40) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(800, i);
                ctx.stroke();
            }

            // ユーザーを描画
            users.forEach((user) => {
                const doingInfo = DOING_CONTENT[user.doing];

                // 影
                ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
                ctx.beginPath();
                ctx.ellipse(user.x, user.y + 35, 20, 8, 0, 0, Math.PI * 2);
                ctx.fill();

                // キャラクター（円）
                ctx.fillStyle = user.isYou ? "#2C3E50" : doingInfo.color;
                ctx.beginPath();
                ctx.arc(user.x, user.y, 25, 0, Math.PI * 2);
                ctx.fill();

                // 目
                ctx.fillStyle = "#FFFFFF";
                ctx.beginPath();
                ctx.arc(user.x - 8, user.y - 5, 5, 0, Math.PI * 2);
                ctx.arc(user.x + 8, user.y - 5, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#2C3E50";
                ctx.beginPath();
                ctx.arc(user.x - 8, user.y - 4, 3, 0, Math.PI * 2);
                ctx.arc(user.x + 8, user.y - 4, 3, 0, Math.PI * 2);
                ctx.fill();

                // 名前
                ctx.fillStyle = "#2C3E50";
                ctx.font = "bold 14px 'M PLUS Rounded 1c', sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(user.name, user.x, user.y - 40);

                // doingアイコン
                ctx.font = "24px serif";
                ctx.fillText(doingInfo.emoji, user.x + 30, user.y - 20);

                // doingラベル（小さく）
                ctx.font = "11px 'M PLUS Rounded 1c', sans-serif";
                ctx.fillStyle = doingInfo.color;
                ctx.fillText(doingInfo.label, user.x + 30, user.y);
            });

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [users]);

    // ユーザークリック
    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedUser = users.find((user) => {
            const distance = Math.sqrt(
                Math.pow(x - user.x, 2) + Math.pow(y - user.y, 2),
            );
            return distance < 25;
        });

        if (clickedUser && !clickedUser.isYou) {
            setSelectedUser(clickedUser);
        }
    };

    return (
        <div style={styles.container}>
            <style>{`
		@import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;900&display=swap');
		
		* {
		  box-sizing: border-box;
		}
		
		body {
		  margin: 0;
		  font-family: 'M PLUS Rounded 1c', sans-serif;
		  background: #FBF8F3;
		}
	  `}</style>

            <div style={styles.header}>
                <h1 style={styles.title}>zatsudan</h1>
                <p style={styles.subtitle}>いるだけの場所</p>
            </div>

            <div style={styles.mainContent}>
                <div style={styles.canvasWrapper}>
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        onClick={handleCanvasClick}
                        style={styles.canvas}
                    />
                    <div style={styles.controls}>
                        <p style={styles.controlText}>
                            ← ↑ → ↓ または WASD で移動
                        </p>
                    </div>
                </div>

                <div style={styles.sidebar}>
                    <div style={styles.onlineSection}>
                        <h3 style={styles.sectionTitle}>
                            オンライン ({users.length})
                        </h3>
                        {users.map((user) => (
                            <div
                                key={user.id}
                                style={{
                                    ...styles.userCard,
                                    ...(selectedUser?.id === user.id
                                        ? styles.userCardSelected
                                        : {}),
                                }}
                                onClick={() =>
                                    !user.isYou && setSelectedUser(user)
                                }
                            >
                                <div
                                    style={{
                                        ...styles.userDot,
                                        backgroundColor:
                                            DOING_CONTENT[user.doing].color,
                                    }}
                                />
                                <div style={styles.userInfo}>
                                    <div style={styles.userName}>
                                        {user.name} {user.isYou && "（あなた）"}
                                    </div>
                                    <div style={styles.userDoing}>
                                        {DOING_CONTENT[user.doing].emoji}{" "}
                                        {DOING_CONTENT[user.doing].label}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {visitHistory.length > 0 && (
                        <div style={styles.historySection}>
                            <h3 style={styles.sectionTitle}>訪問履歴</h3>
                            {visitHistory
                                .slice(-5)
                                .reverse()
                                .map((visit, idx) => (
                                    <div
                                        key={`${visit.userId}-${visit.timestamp}`}
                                        style={styles.historyItem}
                                    >
                                        <span style={styles.historyEmoji}>
                                            {DOING_CONTENT[visit.doing].emoji}
                                        </span>
                                        <span style={styles.historyText}>
                                            {visit.userName}さんが
                                            {DOING_CONTENT[visit.doing].label}
                                            でした
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}

                    {selectedUser && (
                        <div style={styles.detailSection}>
                            <h3 style={styles.sectionTitle}>
                                {selectedUser.name}さん
                            </h3>
                            <div style={styles.doingDetail}>
                                <span style={styles.doingEmoji}>
                                    {DOING_CONTENT[selectedUser.doing].emoji}
                                </span>
                                <span style={styles.doingLabel}>
                                    {DOING_CONTENT[selectedUser.doing].label}
                                </span>
                            </div>
                            <textarea
                                placeholder="コメントを残す..."
                                style={styles.commentBox}
                            />
                            <button style={styles.commentButton}>送信</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #FBF8F3 0%, #F5F1E8 100%)",
        padding: "20px",
    },
    header: {
        textAlign: "center",
        marginBottom: "30px",
    },
    title: {
        fontSize: "48px",
        fontWeight: "900",
        color: "#2C3E50",
        margin: "0 0 8px 0",
        letterSpacing: "2px",
        textTransform: "lowercase",
    },
    subtitle: {
        fontSize: "16px",
        color: "#7F8C8D",
        margin: 0,
        fontWeight: "400",
    },
    mainContent: {
        display: "flex",
        gap: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
    },
    canvasWrapper: {
        flex: "1",
        position: "relative",
    },
    canvas: {
        border: "3px solid #E8DCC8",
        borderRadius: "16px",
        background: "#FFF",
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
    },
    controls: {
        marginTop: "12px",
        textAlign: "center",
    },
    controlText: {
        fontSize: "14px",
        color: "#95A5A6",
        margin: 0,
    },
    sidebar: {
        width: "320px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    onlineSection: {
        background: "#FFF",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "700",
        color: "#2C3E50",
        margin: "0 0 16px 0",
    },
    userCard: {
        display: "flex",
        alignItems: "center",
        padding: "12px",
        borderRadius: "12px",
        marginBottom: "8px",
        cursor: "pointer",
        transition: "all 0.2s",
        background: "#F8F9FA",
    },
    userCardSelected: {
        background: "#E8F4F8",
        transform: "translateX(4px)",
    },
    userDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        marginRight: "12px",
        flexShrink: 0,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: "14px",
        fontWeight: "700",
        color: "#2C3E50",
        marginBottom: "4px",
    },
    userDoing: {
        fontSize: "12px",
        color: "#7F8C8D",
    },
    historySection: {
        background: "#FFF",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
    },
    historyItem: {
        display: "flex",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid #F0F0F0",
    },
    historyEmoji: {
        fontSize: "20px",
        marginRight: "12px",
    },
    historyText: {
        fontSize: "13px",
        color: "#7F8C8D",
    },
    detailSection: {
        background: "#FFF",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
    },
    doingDetail: {
        display: "flex",
        alignItems: "center",
        marginBottom: "16px",
        padding: "12px",
        background: "#F8F9FA",
        borderRadius: "8px",
    },
    doingEmoji: {
        fontSize: "32px",
        marginRight: "12px",
    },
    doingLabel: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#2C3E50",
    },
    commentBox: {
        width: "100%",
        minHeight: "80px",
        padding: "12px",
        borderRadius: "8px",
        border: "2px solid #E8DCC8",
        fontSize: "14px",
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        resize: "vertical",
        marginBottom: "12px",
        outline: "none",
    },
    commentButton: {
        width: "100%",
        padding: "12px",
        background: "#4A90E2",
        color: "#FFF",
        border: "none",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s",
    },
};

export default ZatsudanSpace;
