# SmartAds Settings Guide 📺

This guide explains all the settings in simple words so anyone can understand them!

---

## 🎯 Detection Settings

### Sensitivity Slider (0.3 - 0.6)
**What it does:** Decides how hard the system tries to find faces.

| Value | What happens |
|-------|--------------|
| **Low (0.3)** | Only finds very clear, obvious faces. Might miss some people. |
| **Medium (0.4)** | Balanced - good for most situations. |
| **High (0.6)** | Tries really hard to find everyone. Might sometimes think a wall is a face! |

🎯 **Think of it like:** A metal detector at the beach - higher sensitivity finds more stuff, but some of it might not be treasure!

---

### False Positive Guard (0.10 - 0.30)
**What it does:** Stops the system from thinking objects (walls, posters, doors) are faces.

| Value | What happens |
|-------|--------------|
| **Low (0.10)** | Accepts more detections (risky - might see faces in walls) |
| **Medium (0.18)** | Good balance for most cases |
| **High (0.30)** | Only accepts very face-like things (safer but might miss some) |

🎯 **Think of it like:** A guard at the door - a strict guard only lets in people who look exactly right!

---

### Demographic Confidence (0.5 - 0.95)
**What it does:** How sure the system must be before saying someone is male/female/kid/adult.

| Value | What happens |
|-------|--------------|
| **Low (0.5)** | Makes guesses even when not sure |
| **High (0.95)** | Only says something when very confident |

🎯 **Think of it like:** A quiz show - do you answer when you're 50% sure or wait until you're 90% sure?

---

## 🎬 Video & CCTV Settings

### Detection Mode
**What it does:** Changes how the AI looks for faces.

| Mode | Description |
|------|-------------|
| **Fast** | Quick detection, good for powerful computers |
| **Accurate** | Slower but more reliable |
| **Aggressive** | Tries extra hard (for difficult footage) |
| **Max Recall** | Finds as many faces as possible |

---

### Video Quality Preset
**What it does:** Tells the system what kind of camera you're using.

| Quality | When to use |
|---------|-------------|
| **High Quality** | For good cameras with clear, sharp images |
| **Low Quality CCTV** | For old security cameras with blurry, grainy images |

The system adjusts its brain based on this!

---

### CCTV Mode Toggle
**What it does:** Turns on special settings designed for security camera footage.

When ON:
- Uses stronger image enhancement
- More aggressive face searching
- Multi-pass detection (looks multiple times)
- Better handling of blurry/distant faces

---

### Dual Model Mode (for Video)
**What it does:** Uses TWO different AI brains together instead of just one.

| Setting | AI Models Used |
|---------|----------------|
| **OFF** | Just TinyFaceDetector (fast) |
| **ON** | TinyFaceDetector + SSD Mobilenet (more accurate) |

🎯 **Think of it like:** Two heads are better than one! Slower but catches more faces.

---

### Enable YOLO (for Video)
**What it does:** Uses a special AI called YOLO (You Only Look Once).

**Why YOLO is special:**
- Really good at finding faces in crowds
- Works better with small or distant faces
- Designed for real-time video

**Requirements:**
- Needs a special model file to work
- Click "Download YOLO Model" in settings to get it
- Best for busy places with lots of people

---

## 👩 Female Detection Settings

### Female Boost Factor (0 - 0.30)
**What it does:** The AI tends to guess "male" too often. This fixes that!

| Value | Effect |
|-------|--------|
| **0** | No boost (AI might say male more often) |
| **0.15** | Small boost to female guesses (recommended) |
| **0.30** | Big boost to female guesses |

🎯 **Think of it like:** Putting your thumb on a scale to balance it out. The AI has a bias, and this corrects it!

---

### Hair Detection Heuristics
**What it does:** Uses extra clues beyond just the face to guess gender.

What it looks at:
- Hair length and style
- Shape of the head outline
- Facial proportions

🎯 **Think of it like:** A detective looking for more clues! Longer hair might mean female, but it's not always right.

---

### Require Face Texture
**What it does:** Checks if a detection actually looks like real human skin.

When ON:
- Filters out walls, doors, and flat surfaces
- Makes sure it's actually a person's face
- Reduces "ghost" detections

---

## 🏷️ Labeling Mode

### What is Labeling?
Labeling mode lets YOU teach the AI by telling it when it's right or wrong!

**How to use it:**
1. Turn on the "Label" toggle
2. Click on "Label This Face" button on any detected face
3. Tell the system the CORRECT gender and age
4. Click Save

Your labels are saved and used to measure how well the AI is doing!

---

### False Positive Checkbox
**What it does:** Lets you mark detections that are NOT actually faces.

Check this box when:
- The AI thinks a poster is a face
- The AI sees a face in a wall pattern
- The AI detected a mannequin or statue

This helps the evaluation know which detections were mistakes!

---

## 📊 How Detection Modes Work

Here's how the different AI models work together:

```
Video Frame
    │
    ▼
┌───────────────────────────────────────┐
│  YOLO Detection (if enabled)          │
│  - Great for crowds                   │
│  - Finds small faces                  │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│  TinyFace Detector (always runs)      │
│  - Fast and efficient                 │
│  - Good for clear faces               │
└───────────────────────────────────────┘
    │
    ▼ (if Dual Mode ON)
┌───────────────────────────────────────┐
│  SSD Mobilenet (backup)               │
│  - More accurate                      │
│  - Catches missed faces               │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│  Age & Gender Classification          │
│  - Determines demographics            │
│  - Uses face-api.js AgeGenderNet      │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│  Female Boost Applied                 │
│  - Corrects gender bias               │
│  - Uses Hair Heuristics (if enabled)  │
└───────────────────────────────────────┘
    │
    ▼
   Results shown on screen!
```

---

## 🔧 Recommended Settings

### For Good Quality Webcam
| Setting | Value |
|---------|-------|
| Sensitivity | 0.35 |
| False Positive Guard | 0.15 |
| Detection Mode | Accurate |
| Dual Mode | OFF |
| YOLO | OFF |
| Female Boost | 0.10 |

### For Old CCTV Footage
| Setting | Value |
|---------|-------|
| Sensitivity | 0.45 |
| False Positive Guard | 0.20 |
| Detection Mode | Aggressive |
| Video Quality | Low Quality CCTV |
| CCTV Mode | ON |
| Dual Mode | ON |
| YOLO | ON |
| Female Boost | 0.15 |

### For Crowded Places
| Setting | Value |
|---------|-------|
| Sensitivity | 0.40 |
| False Positive Guard | 0.18 |
| Detection Mode | Max Recall |
| Dual Mode | ON |
| YOLO | ON |
| Female Boost | 0.15 |

### For Few People, Quick Results
| Setting | Value |
|---------|-------|
| Sensitivity | 0.30 |
| False Positive Guard | 0.12 |
| Detection Mode | Fast |
| Dual Mode | OFF |
| YOLO | OFF |

---

## 📈 Evaluation Dashboard

Visit the Model Evaluation page to see how well the AI is doing!

**How to access:**
1. Go to Settings
2. Click "Model Evaluation Dashboard" link at the bottom
3. Enter passcode: `smartads2024`

**What you'll see:**
- Accuracy percentages for gender and age
- Precision and recall scores
- List of all your labeled entries
- Recommendations for improving settings

---

## 🤔 Common Questions

### Why does the AI say "male" so often?
The AI was trained on data that had more male faces. That's why we have the "Female Boost Factor" to help balance it out!

### Why does it detect faces on walls?
The AI sometimes sees patterns that look like faces. Increase the "False Positive Guard" to reduce this!

### Why can't it find faces in my CCTV footage?
CCTV footage is often blurry and low quality. Try:
1. Turn on CCTV Mode
2. Enable Dual Model
3. Download and enable YOLO
4. Increase Sensitivity

### What's the capture window?
The capture window is the time during an ad when the system counts viewers. For example, 60%-100% means it counts viewers during the last 40% of the ad.

---

## 📚 Technical Details (for developers)

### Models Used
- **TinyFaceDetector**: Lightweight face detection (~200KB)
- **SSD Mobilenet V1**: Accurate face detection (~5MB)
- **AgeGenderNet**: Demographics classification (~400KB)
- **YOLOv8-face**: Crowd-optimized detection (optional, ~25MB)

### Backend
- TensorFlow.js with WebGL acceleration
- Face-api.js for detection and classification
- IndexedDB for model caching

### Performance Tips
- WebGL backend is fastest
- Close other browser tabs for better performance
- Lower resolution video = faster detection
- Disable YOLO for webcam use

---

*Last updated: January 2025*
