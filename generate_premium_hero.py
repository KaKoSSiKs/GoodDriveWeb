import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math
import random

# Config
WIDTH = 1200
HEIGHT = 800
OUTPUT_PATH = "static/images/hero_premium.png"

def create_gradient(width, height, c1, c2):
    base = Image.new('RGB', (width, height), c1)
    top = Image.new('RGB', (width, height), c2)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        mask_data.extend([int(255 * (y / height))] * width)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def draw_glass_shape(img, rect, radius, fill_color, border_color, blur_radius=10):
    # Draw shadow
    shadow = Image.new('RGBA', img.size, (0,0,0,0))
    draw_shadow = ImageDraw.Draw(shadow)
    x1, y1, x2, y2 = rect
    draw_shadow.rounded_rectangle([x1+10, y1+10, x2+10, y2+10], radius=radius, fill=(0,0,0,30))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur_radius))
    img.paste(shadow, (0,0), shadow)
    
    # Draw glass body
    glass = Image.new('RGBA', img.size, (0,0,0,0))
    draw_glass = ImageDraw.Draw(glass)
    draw_glass.rounded_rectangle(rect, radius=radius, fill=fill_color)
    
    # Add noise/texture to glass for realism
    # (Simplified: just keeping it semi-transparent white)
    
    img.paste(glass, (0,0), glass)
    
    # Draw border (shine)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(rect, radius=radius, outline=border_color, width=2)

def generate_image():
    # 1. Background: Subtle Silver/White Gradient
    img = create_gradient(WIDTH, HEIGHT, (248, 249, 250), (220, 224, 229)) # #F8F9FA to #DCE0E5
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # 2. Abstract "Speed Lines" / Curves
    # Metallic curves
    for i in range(5):
        points = []
        start_y = random.randint(100, HEIGHT-100)
        end_y = random.randint(100, HEIGHT-100)
        
        # Bezier-like curve points
        p1 = (0, start_y)
        p2 = (WIDTH * 0.3, start_y - random.randint(-100, 100))
        p3 = (WIDTH * 0.7, end_y + random.randint(-100, 100))
        p4 = (WIDTH, end_y)
        
        # Draw curve (simple line approximation)
        # Just drawing smooth lines
        color = (255, 255, 255, 100) if i % 2 == 0 else (200, 200, 200, 150)
        width = random.randint(2, 15)
        
        # Simple line for now, PIL doesn't do complex bezier easily without custom logic
        # Let's draw sweeping arcs
        bbox = [-WIDTH, -HEIGHT, WIDTH*2, HEIGHT*2]
        start_angle = random.randint(0, 180)
        end_angle = start_angle + random.randint(45, 120)
        draw.arc(bbox, start_angle, end_angle, fill=color, width=width)

    # 3. Floating "Glass" Cards/Shapes (NextGen UI feel)
    
    # Card 1 (Top Right)
    draw_glass_shape(img, (WIDTH*0.6, HEIGHT*0.1, WIDTH*0.9, HEIGHT*0.5), 30, (255, 255, 255, 180), (255, 255, 255, 255))
    
    # Card 2 (Bottom Left - overlapping)
    draw_glass_shape(img, (WIDTH*0.1, HEIGHT*0.4, WIDTH*0.5, HEIGHT*0.8), 30, (255, 255, 255, 120), (255, 255, 255, 200))
    
    # 4. Abstract 3D Sphere (Simulated)
    # Center sphere
    sphere_bounds = [WIDTH*0.4, HEIGHT*0.2, WIDTH*0.8, HEIGHT*0.8] # x1, y1, x2, y2
    # We can't easily do a 3D render, but we can draw a circle with a radial gradient
    
    # Create a separate layer for the sphere to apply gradients
    sphere_layer = Image.new('RGBA', img.size, (0,0,0,0))
    draw_sphere = ImageDraw.Draw(sphere_layer)
    
    # Soft glow behind
    draw_sphere.ellipse([b - 40 for b in sphere_bounds], fill=(255, 255, 255, 100))
    
    # Main circle - Greyish
    draw_sphere.ellipse(sphere_bounds, fill=(240, 240, 245, 255), outline=(255,255,255,255), width=2)
    
    # Composite
    img.paste(sphere_layer, (0,0), sphere_layer)
    
    # 5. Add Text-like abstract lines (mockup details)
    # Just some lines to suggest "blueprint" or "tech"
    draw.line([(WIDTH*0.65, HEIGHT*0.25), (WIDTH*0.85, HEIGHT*0.25)], fill=(50, 50, 50, 50), width=2)
    draw.line([(WIDTH*0.65, HEIGHT*0.30), (WIDTH*0.80, HEIGHT*0.30)], fill=(150, 150, 150, 50), width=2)

    # Ensure directory exists
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    
    # Save
    img.save(OUTPUT_PATH)
    print(f"Generated premium hero image at {OUTPUT_PATH}")

if __name__ == "__main__":
    try:
        generate_image()
    except Exception as e:
        print(f"Error generating image: {e}")

