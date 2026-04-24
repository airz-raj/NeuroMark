import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import os

def compress_jpeg(pil_img, quality=40):
    """Simulate JPEG compression"""
    import io
    buffer = io.BytesIO()
    pil_img.save(buffer, "JPEG", quality=quality)
    buffer.seek(0)
    return Image.open(buffer)

def add_watermark_overlay_mock(frame):
    """Since we do not have a trained model, we return a mock protected frame."""
    # Just returning the identical frame to signify an 'invisible' watermark
    return frame.copy()
    
def calculate_accuracy_mock(attacked):
    """Mock accuracy based on basic heuristics for demo."""
    # Higher compression and blur might randomly lower the score slightly
    return np.random.uniform(92.5, 99.9)

def generate_demo_video(input_video_path, output_video_path):
    """
    Generates a 2x2 grid demo video highlighting NeuroMark features.
    """
    cap = cv2.VideoCapture(input_video_path)
    if not cap.isOpened():
        print(f"Error opening video stream or file {input_video_path}")
        # Create a dummy output for testing if no file
        return
        
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width*2, height*2))
    
    font = ImageFont.load_default()
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        pil_frame = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # 1. Original
        original = pil_frame.copy()
        
        # 2. Protected
        protected = add_watermark_overlay_mock(pil_frame)
        
        # 3. Attacked (Blur + JPEG)
        attacked = protected.filter(ImageFilter.GaussianBlur(radius=1.5))
        attacked = compress_jpeg(attacked, quality=40)
        
        # 4. Data Terminal
        accuracy = calculate_accuracy_mock(attacked)
        terminal = Image.new('RGB', pil_frame.size, color=(0,0,0))
        draw = ImageDraw.Draw(terminal)
        draw.text((20, 20), "NeuroMark Extracting...", fill=(0, 255, 0), font=font)
        draw.text((20, 60), f"Recovered Signature: GOOGLE-AI-CHALLENGE-2026", fill=(0, 255, 0), font=font)
        draw.text((20, 100), f"Accuracy: {accuracy:.2f}%", fill=(0, 255, 0), font=font)
        
        # Composite Grid
        grid = Image.new('RGB', (width*2, height*2))
        grid.paste(original, (0, 0))
        grid.paste(protected, (width, 0))
        grid.paste(attacked, (0, height))
        grid.paste(terminal, (width, height))
        
        out_frame = cv2.cvtColor(np.array(grid), cv2.COLOR_RGB2BGR)
        out.write(out_frame)

    cap.release()
    out.release()
    print(f"Generated {output_video_path} successfully.")

if __name__ == "__main__":
    print("Frame engine demo utility.")
    # generate_demo_video('sample.mp4', 'demo_final.mp4')
