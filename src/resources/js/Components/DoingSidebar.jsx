import React, { useMemo, useState } from "react";

export default function DoingSidebar({
    title,
    comments,
    onSend,

    // 親から開閉制御
    open: controlledOpen,
    onOpenChange,
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(true);

    const open =
        typeof controlledOpen === "boolean" ? controlledOpen : uncontrolledOpen;

    const setOpen = (next) => {
        if (typeof controlledOpen === "boolean") {
            onOpenChange?.(next);
        } else {
            setUncontrolledOpen(next);
        }
    };

    const [text, setText] = useState("");

    // ✅ comments が配列じゃない時に落ちるのを防ぐ
    const safeComments = useMemo(() => {
        return Array.isArray(comments) ? comments : [];
    }, [comments]);

    const handleSend = () => {
        const v = text.trim();
        if (!v) return;
        onSend?.(v);
        setText("");
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    position: "fixed",
                    right: 16,
                    top: 16,
                    zIndex: 9999,
                    padding: "10px 12px",
                    borderRadius: 999,
                    background: "var(--btn-bg)",
                    border: "1px solid var(--btn-border)",
                    color: "var(--text)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    cursor: "pointer",
                }}
            >
                {open ? "→ 閉じる" : "← 開く"}
            </button>

            <aside
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100vh",
                    width: 360,
                    zIndex: 9998,
                    padding: 14,
                    boxSizing: "border-box",
                    background: "var(--panel-bg)",
                    borderLeft: "1px solid var(--panel-border)",
                    color: "var(--text)",
                    boxShadow: "var(--shadow)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    transform: open ? "translateX(0)" : "translateX(102%)",
                    transition: "transform 220ms ease",
                    pointerEvents: open ? "auto" : "none",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 13,
                                opacity: 0.85,
                                color: "var(--text-sub)",
                            }}
                        >
                            doing
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                            {title}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflow: "auto", paddingRight: 6 }}>
                        {safeComments.length === 0 ? (
                            <div
                                style={{
                                    opacity: 0.65,
                                    fontSize: 13,
                                    color: "var(--text-sub)",
                                }}
                            >
                                コメントはまだないよ
                            </div>
                        ) : (
                            safeComments.map((c) => (
                                <div
                                    key={c.id}
                                    style={{
                                        padding: 10,
                                        borderRadius: 12,
                                        background: "var(--card-bg)",
                                        border: "1px solid var(--card-border)",
                                        lineHeight: 1.5,
                                        boxShadow: "var(--shadow)",
                                        marginBottom: 10,
                                    }}
                                >
                                    {c.body}
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="ひとこと…"
                            rows={2}
                            style={{
                                width: "100%",
                                resize: "none",
                                padding: 10,
                                borderRadius: 12,
                                border: "1px solid var(--card-border)",
                                background: "var(--card-bg)",
                                color: "var(--text)",
                                outline: "none",
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: "1px solid var(--btn-border)",
                                background: "var(--btn-bg)",
                                color: "var(--text)",
                                cursor: "pointer",
                            }}
                        >
                            送信
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
