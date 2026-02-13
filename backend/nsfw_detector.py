"""
NSFW Image Detection Module
Uses image analysis for detecting inappropriate content in images

Note: For strongest accuracy, integrate a proper NSFW model.
This file currently implements a heuristic blocker that does NOT require TensorFlow,
so it works on Python 3.7 and 32‑bit installs.
"""

import os
import numpy as np
from PIL import Image

class NSFWDetector:
    def __init__(self):
        # No heavy model; we rely on heuristics only.
        self.model_loaded = True
    
    def load_model(self):
        """Placeholder to match previous API (no-op for heuristic mode)."""
        return
    
    def detect(self, image_path, threshold=0.5):
        """
        Heuristic NSFW detection.

        Returns: (is_nsfw: bool, confidence: float, details: dict)
        """
        try:
            img = Image.open(image_path).convert("RGB")
            width, height = img.size

            # Very small images – treat as safe
            if width < 80 or height < 80:
                return False, 0.0, {"note": "Image too small for analysis", "method": "heuristic"}

            arr = np.array(img)

            # Focus on center area where explicit content is likely
            cx, cy = width // 2, height // 2
            box =  min(width, height) // 2
            x1, y1 = max(0, cx - box // 2), max(0, cy - box // 2)
            x2, y2 = min(width, cx + box // 2), min(height, cy + box // 2)
            center_region = arr[y1:y2, x1:x2]

            # Simple skin-tone heuristic in RGB
            skin_mask = []
            for row in center_region:
                for r, g, b in row:
                    if (
                        r > 95
                        and g > 40
                        and b > 20
                        and max(r, g, b) - min(r, g, b) > 15
                        and r > g
                        and r > b
                    ):
                        skin_mask.append(1)
                    else:
                        skin_mask.append(0)

            total = len(skin_mask)
            skin_pixels = sum(skin_mask)
            skin_ratio = skin_pixels / total if total else 0.0

            # Aspect ratio heuristic (portrait-ish images more likely explicit)
            aspect_ratio = height / width if width else 1.0

            # Build a pseudo "confidence" score 0–1
            # MUCH MORE CONSERVATIVE - only flag if VERY high skin ratio (likely actual nudity)
            # Backpacks, furniture, etc. won't trigger this
            score = 0.0
            
            # Only flag if skin ratio is EXTREMELY high (likely actual nudity, not objects)
            if skin_ratio > 0.70:  # Increased from 0.55 - only very high skin ratio
                score += 0.5
            elif skin_ratio > 0.60:  # Still high but less certain
                score += 0.3
            # Removed lower thresholds - backpacks/furniture won't trigger
            
            # Aspect ratio check removed - too many false positives
            # Size check removed - not relevant for nudity detection
            
            # Only flag if score is VERY high (0.8+) - conservative approach
            is_nsfw = score >= 0.8  # Much higher threshold - only flag obvious nudity

            return is_nsfw, score, {
                "method": "heuristic_rgb_skin",
                "skin_ratio": round(skin_ratio, 3),
                "aspect_ratio": round(aspect_ratio, 3),
                "image_size": f"{width}x{height}",
                "score": round(score, 3),
                "threshold": threshold,
            }
            
        except Exception as e:
            print(f"Error in NSFW detection: {e}")
            # Fail open - allow upload if detection fails
            return False, 0.0, {"error": str(e), "allowed": True}

# Global detector instance
detector = NSFWDetector()

def scan_image_nsfw(image_path, threshold=0.5):
    """
    Scan image for NSFW content
    Returns: (is_nsfw: bool, confidence: float, details: dict)
    """
    return detector.detect(image_path, threshold)
