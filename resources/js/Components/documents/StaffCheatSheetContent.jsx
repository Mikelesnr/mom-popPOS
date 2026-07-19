const INK = "#241C15";
const GREEN = "#123D26";
const RED = "#D8392A";
const MUTED = "#5C5346";
const LINE = "#E8DFCB";
const CREAM = "#FFFCF5";

const page = {
    padding: "14mm",
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: INK,
    fontSize: "11pt",
    lineHeight: 1.5,
    backgroundColor: "#fff",
};

const header = {
    backgroundColor: GREEN,
    color: CREAM,
    padding: "12pt 14pt",
    marginBottom: "16pt",
};

const brand = {
    fontSize: "11pt",
    fontWeight: 700,
    letterSpacing: "1pt",
    margin: 0,
};
const title = { fontSize: "19pt", fontWeight: 700, margin: "4pt 0 0" };

const sectionTitle = {
    fontSize: "10.5pt",
    fontWeight: 700,
    color: RED,
    margin: "0 0 6pt",
    textTransform: "uppercase",
    letterSpacing: "0.5pt",
};

const bulletRow = { display: "flex", gap: "8pt", marginBottom: "5pt" };
const bulletMark = { color: RED, fontWeight: 700 };

const box = {
    border: `1pt solid ${MUTED}`,
    padding: "10pt",
    marginTop: "4pt",
    backgroundColor: "#FBF8F1",
};

function Bullet({ children }) {
    return (
        <div style={bulletRow}>
            <span style={bulletMark}>—</span>
            <span>{children}</span>
        </div>
    );
}

export default function StaffCheatSheetContent() {
    return (
        <div style={page}>
            <style>{"@page { size: A5; margin: 0; }"}</style>

            <div style={header}>
                <p style={brand}>MOM &amp; POP POS</p>
                <p style={title}>Staff Quick Reference</p>
            </div>

            <div style={{ marginBottom: "16pt" }}>
                <p style={sectionTitle}>Logging in</p>
                <Bullet>
                    Enter your 4-digit PIN on a paired device. New device or
                    forgot your PIN? Ask your manager.
                </Bullet>
            </div>

            <div style={{ marginBottom: "16pt" }}>
                <p style={sectionTitle}>Ringing up a sale</p>
                <Bullet>Quick counter sale? Use Fast Sale.</Bullet>
                <Bullet>
                    Guests staying a while? Open a Table so it stays open until
                    they're ready to pay.
                </Bullet>
            </div>

            <div style={{ marginBottom: "16pt" }}>
                <p style={sectionTitle}>
                    End of shift — every device, every time
                </p>
                <div style={box}>
                    <p style={{ fontWeight: 700, margin: "0 0 4pt" }}>
                        Press SYNC before you clock off.
                    </p>
                    <p style={{ margin: 0 }}>
                        Cash-up can't total your sales until your device has
                        synced. If you don't sync, your sales won't be counted.
                    </p>
                </div>
            </div>

            <div>
                <p style={sectionTitle}>Good to know</p>
                <Bullet>
                    Walked-out guest? Ask a manager to defer the table rather
                    than leaving it open.
                </Bullet>
                <Bullet>
                    Breakages or spills get logged as wasted stock by a manager
                    — it still shows on the books, so flag it rather than
                    letting stock quietly disappear.
                </Bullet>
            </div>
        </div>
    );
}
