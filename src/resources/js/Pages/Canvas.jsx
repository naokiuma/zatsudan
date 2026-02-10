import React, { useEffect, useMemo, useRef } from "react";

/**
 * Canvas prototype:
 * - 3 direction sprites: front/back/side (side is flipped for left)
 * - y-sort for depth
 * - pseudo perspective scaling by y
 * - camera follows player
 * - up to 100 NPC wanderers
 */

const W = 1100;
const H = 650;

// ワールドの広さ（適当）
const WORLD_W = 2400;
const WORLD_H = 1400;

// 画像パス（public配下に置く想定）
const SPRITES = {
    front: "/avatars/front.png",
    back: "/avatars/back.png",
    side: "/avatars/side.png",
};

// 方向判定（B案）
function getDirection(vx, vy) {
    if (Math.abs(vx) > Math.abs(vy)) return "side";
    if (vy > 0) return "front";
    if (vy < 0) return "back";
    return "front";
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

export default function CanvasRoomPrototype() {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);
    const keysRef = useRef(new Set());
    const imgsRef = useRef({ front: null, back: null, side: null });
    const readyRef = useRef({ front: false, back: false, side: false });

    // プレイヤー + NPC（初期化は一回）
    const state = useMemo(() => {
        const player = {
            id: "me",
            x: WORLD_W * 0.5,
            y: WORLD_H * 0.6,
            vx: 0,
            vy: 0,
            dir: "front",
            speed: 260, // px/s
        };

        const npcs = Array.from({ length: 70 }, (_, i) => ({
            id: `npc-${i}`,
            x: 200 + Math.random() * (WORLD_W - 400),
            y: 200 + Math.random() * (WORLD_H - 400),
            vx: 0,
            vy: 0,
            dir: "front",
            // うろうろ用
            targetX: 200 + Math.random() * (WORLD_W - 400),
            targetY: 200 + Math.random() * (WORLD_H - 400),
            baseSpeed: 60 + Math.random() * 60,
            nextTargetAt: 0,
        }));

        const camera = { x: 0, y: 0 };

        return { player, npcs, camera };
    }, []);

    useEffect(() => {
        // key handlers
        const onKeyDown = (e) => {
            keysRef.current.add(e.key);
            // ページスクロール抑止（矢印）
            if (
                ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                    e.key,
                )
            ) {
                e.preventDefault();
            }
        };
        const onKeyUp = (e) => keysRef.current.delete(e.key);

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp);

        // load images
        const load = (k, src) =>
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    imgsRef.current[k] = img;
                    readyRef.current[k] = true;
                    resolve();
                };
                img.onerror = () => {
                    // 画像無くても動くようにする
                    readyRef.current[k] = false;
                    resolve();
                };
                img.src = src;
            });

        let stop = false;

        (async () => {
            await Promise.all([
                load("front", SPRITES.front),
                load("back", SPRITES.back),
                load("side", SPRITES.side),
            ]);

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");

            let last = performance.now();

            const tick = (now) => {
                if (stop) return;
                const dt = Math.min(0.033, (now - last) / 1000); // 最大33ms
                last = now;

                update(dt, now);
                render(ctx);

                rafRef.current = requestAnimationFrame(tick);
            };

            rafRef.current = requestAnimationFrame(tick);
        })();

        return () => {
            stop = true;
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function update(dt, nowMs) {
        const { player, npcs, camera } = state;
        const keys = keysRef.current;

        // --- player move ---
        let ax = 0,
            ay = 0;
        if (keys.has("ArrowLeft") || keys.has("a")) ax -= 1;
        if (keys.has("ArrowRight") || keys.has("d")) ax += 1;
        if (keys.has("ArrowUp") || keys.has("w")) ay -= 1;
        if (keys.has("ArrowDown") || keys.has("s")) ay += 1;

        // 斜めを正規化
        const len = Math.hypot(ax, ay) || 1;
        ax /= len;
        ay /= len;

        player.vx = ax * player.speed;
        player.vy = ay * player.speed;

        player.x = clamp(player.x + player.vx * dt, 40, WORLD_W - 40);
        player.y = clamp(player.y + player.vy * dt, 80, WORLD_H - 20);

        player.dir = getDirection(player.vx, player.vy);

        // --- NPC wander ---
        for (const n of npcs) {
            if (nowMs > n.nextTargetAt) {
                n.targetX = 200 + Math.random() * (WORLD_W - 400);
                n.targetY = 200 + Math.random() * (WORLD_H - 400);
                n.nextTargetAt = nowMs + 1500 + Math.random() * 2500;
            }

            const dx = n.targetX - n.x;
            const dy = n.targetY - n.y;
            const d = Math.hypot(dx, dy) || 1;
            const vx = (dx / d) * n.baseSpeed;
            const vy = (dy / d) * n.baseSpeed;

            // 近すぎたら次ターゲットへ
            if (d < 8) {
                n.nextTargetAt = 0;
            }

            // プレイヤーと当たりそうなら少し避ける（雑）
            if (dist2(n.x, n.y, player.x, player.y) < 70 * 70) {
                n.x -= (player.x - n.x) * 0.02;
                n.y -= (player.y - n.y) * 0.02;
            }

            n.vx = vx;
            n.vy = vy;
            n.x = clamp(n.x + n.vx * dt, 40, WORLD_W - 40);
            n.y = clamp(n.y + n.vy * dt, 80, WORLD_H - 20);
            n.dir = getDirection(n.vx, n.vy);
        }

        // --- camera follow (center player) ---
        camera.x = clamp(player.x - W / 2, 0, WORLD_W - W);
        camera.y = clamp(player.y - H / 2, 0, WORLD_H - H);
    }

    function getScale(worldY) {
        // 上: 小 / 下: 大（いい感じに）
        const t = clamp(worldY / WORLD_H, 0, 1);
        return 0.55 + t * 0.55; // 0.55〜1.1
    }

    function isOnScreen(sx, sy) {
        // ざっくり表示範囲
        return sx > -200 && sx < W + 200 && sy > -300 && sy < H + 200;
    }

    function drawFallback(ctx, sx, sy, scale, facingLeft, dir) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(facingLeft ? -1 : 1, 1);

        ctx.beginPath();
        ctx.arc(0, -28 * scale, 18 * scale, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(30,30,30,0.85)";
        ctx.fill();

        // 体
        ctx.fillStyle =
            dir === "back" ? "rgba(80,80,80,0.85)" : "rgba(50,50,50,0.85)";
        ctx.fillRect(-14 * scale, -28 * scale, 28 * scale, 34 * scale);

        ctx.restore();
    }

    function drawSprite(ctx, img, sx, sy, scale, facingLeft) {
        const w = img.width;
        const h = img.height;

        ctx.save();
        ctx.translate(sx, sy);

        // 左向きは反転
        if (facingLeft) ctx.scale(-1, 1);

        ctx.scale(scale, scale);

        // 足元基準（画像の下が地面）
        ctx.drawImage(img, -w / 2, -h, w, h);

        ctx.restore();
    }

    function render(ctx) {
        const { player, npcs, camera } = state;

        // 背景：シンプル白（少しだけ柔らかく）
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, W, H);

        // ワールドの床グリッド（雰囲気のため。不要なら消してOK）
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        for (let x = 0; x <= WORLD_W; x += 80) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, WORLD_H);
            ctx.stroke();
        }
        for (let y = 0; y <= WORLD_H; y += 80) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(WORLD_W, y);
            ctx.stroke();
        }
        ctx.restore();

        // 描画対象（プレイヤー含める）
        const all = [...npcs, player];

        // yソート（奥→手前）
        all.sort((a, b) => a.y - b.y);

        for (const p of all) {
            const sx = p.x - camera.x;
            const sy = p.y - camera.y;
            if (!isOnScreen(sx, sy)) continue;

            const scale = getScale(p.y);
            const facingLeft = p.dir === "side" && p.vx < 0;

            const img = imgsRef.current[p.dir];
            if (img && readyRef.current[p.dir]) {
                drawSprite(ctx, img, sx, sy, scale, facingLeft);
            } else {
                drawFallback(ctx, sx, sy, scale, facingLeft, p.dir);
            }

            // 自分だけ目印（なくてもOK）
            if (p.id === "me") {
                ctx.fillStyle = "rgba(0,0,0,0.35)";
                ctx.font = "12px sans-serif";
                ctx.fillText("you", sx - 12, sy - 70 * scale);
            }
        }

        // UI（操作ヘルプ）
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.font = "14px sans-serif";
        ctx.fillText("Move: Arrow keys / WASD", 16, 24);
        ctx.fillText(
            "NPCs: wander (70)  |  Direction: front/back/side",
            16,
            44,
        );
    }

    return (
        <div style={{ padding: 12 }}>
            <canvas
                ref={canvasRef}
                width={W}
                height={H}
                style={{
                    width: W,
                    height: H,
                    borderRadius: 16,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                    background: "#fafafa",
                    display: "block",
                }}
            />
        </div>
    );
}
