from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess
import textwrap

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "demo"
SLIDES = DEMO / "slides"
SLIDES.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
BG = (8, 12, 24)
ACCENT = (0, 240, 255)
TEXT = (230, 240, 255)
SUB = (160, 180, 210)

font_title = ImageFont.load_default()
font_body = ImageFont.load_default()


def read_tail(path: Path, lines: int = 18) -> str:
    if not path.exists():
        return "(log unavailable)"
    content = path.read_text(errors="ignore").splitlines()
    return "\n".join(content[-lines:])


def draw_slide(index: int, title: str, subtitle: str = "", bullets=None, block: str = ""):
    bullets = bullets or []
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    d.rectangle((0, 0, W, 110), fill=(12, 20, 40))
    d.rectangle((0, 100, W, 108), fill=ACCENT)

    d.text((60, 30), f"NeuroMark Demo Walkthrough • Slide {index}", fill=TEXT, font=font_body)
    d.text((60, 150), title, fill=ACCENT, font=font_title)
    if subtitle:
        d.text((60, 190), subtitle, fill=SUB, font=font_body)

    y = 240
    for b in bullets:
        wrapped = textwrap.fill(b, width=85)
        d.text((80, y), f"• {wrapped}", fill=TEXT, font=font_body)
        y += 56

    if block:
        d.rectangle((60, 520, W - 60, H - 80), outline=(70, 90, 130), width=2, fill=(6, 10, 20))
        wrapped_block = "\n".join(textwrap.wrap(block, width=120, replace_whitespace=False))
        d.multiline_text((80, 550), wrapped_block, fill=(170, 220, 170), font=font_body, spacing=6)

    out = SLIDES / f"slide_{index:03d}.png"
    img.save(out)


embed_log = read_tail(DEMO / "cli_embed.txt")
extract_log = read_tail(DEMO / "cli_extract.txt")
demo_log = read_tail(DEMO / "cli_demo.txt")

slides = [
    {
        "title": "Google Hackathon Demo: End-to-End NeuroMark",
        "subtitle": "CLI + Web + Cloud deployment walkthrough",
        "bullets": [
            "This demo covers the operational workflow for enterprise watermarking.",
            "Stack: FastAPI backend, Next.js admin panel, and Cloud Run deployment.",
            "Live URLs are included for judges and reviewers.",
        ],
    },
    {
        "title": "Step 1 — CLI Embed",
        "subtitle": "Command: python -m agent_cli.neuromark embed -i README.md -p GOOGLE-2026",
        "bullets": [
            "Signature is injected and a protection report is rendered in terminal.",
            "This is the batch-security mode for automation pipelines.",
        ],
        "block": embed_log,
    },
    {
        "title": "Step 2 — CLI Extract",
        "subtitle": "Command: python -m agent_cli.neuromark extract -i README.md",
        "bullets": [
            "Verification reads back payload and displays BER confidence metrics.",
            "Used for authenticity checks and trust scoring.",
        ],
        "block": extract_log,
    },
    {
        "title": "Step 3 — CLI Demo Render",
        "subtitle": "Command: python -m agent_cli.neuromark demo -i assets/sample.mp4 -o demo/demo_cli_test.mp4",
        "bullets": [
            "CLI auto-fallback uses system Python with cv2 when venv lacks OpenCV.",
            "This keeps demos fast without reinstalling large local libraries.",
        ],
        "block": demo_log,
    },
    {
        "title": "Step 4 — Web Admin Panel",
        "subtitle": "Deployed Frontend",
        "bullets": [
            "URL: https://neuromark-web-323452330641.us-central1.run.app",
            "Features: threat lab, provenance graph, tamper heatmap, policy controls, and full admin panel history.",
            "Admin panel includes KPIs, filtering, trend chart, and export-ready audit records.",
        ],
    },
    {
        "title": "Step 5 — Cloud Backend API",
        "subtitle": "Deployed FastAPI Service",
        "bullets": [
            "URL: https://neuromark-api-323452330641.us-central1.run.app",
            "Endpoints: /api/v1/verify, /api/v1/protect, /api/v1/history, /api/v1/kms/connect.",
            "Persistence: sqlite scan history, dynamic trust/BER metrics, and deterministic tamper simulation.",
        ],
    },
    {
        "title": "Step 6 — Judge Test Flow",
        "subtitle": "How to validate in under 3 minutes",
        "bullets": [
            "1) Open web URL and click CONNECT KMS.",
            "2) Upload any image/video and run Scan.",
            "3) Run Protect Last Upload and check trust score increase.",
            "4) Open Admin Control Panel and verify scan appears in history.",
            "5) Export JSON for evidence package.",
        ],
    },
    {
        "title": "NeuroMark — Demo Complete",
        "subtitle": "CLI + Web + Cloud confirmed operational",
        "bullets": [
            "GitHub: https://github.com/airz-raj/NeuroMark",
            "Prepared for Google Hackathon judging.",
        ],
    },
]

for i, s in enumerate(slides, start=1):
    draw_slide(i, s["title"], s.get("subtitle", ""), s.get("bullets", []), s.get("block", ""))

slides_video = DEMO / "walkthrough_slides.mp4"
final_video = DEMO / "neuromark_complete_walkthrough.mp4"
cli_clip = DEMO / "demo_cli_test.mp4"

subprocess.run([
    "ffmpeg", "-y", "-framerate", "1/4", "-i", str(SLIDES / "slide_%03d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", str(slides_video)
], check=True)

if cli_clip.exists():
    subprocess.run([
        "ffmpeg", "-y", "-i", str(slides_video), "-i", str(cli_clip),
        "-filter_complex",
        "[1:v]scale=1440:-2:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black[clip];[0:v][clip]concat=n=2:v=1:a=0[v]",
        "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(final_video)
    ], check=True)
else:
    slides_video.rename(final_video)

print(f"Generated: {final_video}")
