# Smart Ads System - Complete Project Documentation

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Purpose and Concept](#2-project-purpose-and-concept)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [AI Detection System](#5-ai-detection-system)
6. [User Interface Components](#6-user-interface-components)
7. [Ad Management System](#7-ad-management-system)
8. [Input Source Management](#8-input-source-management)
9. [Image Preprocessing Pipeline](#9-image-preprocessing-pipeline)
10. [Detection Filtering and False Positive Prevention](#10-detection-filtering-and-false-positive-prevention)
11. [Gender Bias Correction](#11-gender-bias-correction)
12. [Temporal Tracking and Stabilization](#12-temporal-tracking-and-stabilization)
13. [Capture Session Aggregation](#13-capture-session-aggregation)
14. [Data Persistence](#14-data-persistence)
15. [File Structure and Organization](#15-file-structure-and-organization)
16. [Configuration Files](#16-configuration-files)
17. [Detection Modes Explained](#17-detection-modes-explained)
18. [Evaluation System](#18-evaluation-system)
19. [Performance Optimization](#19-performance-optimization)
20. [Theme System](#20-theme-system)
21. [Routing Structure](#21-routing-structure)
22. [Building and Deployment](#22-building-and-deployment)
23. [Browser Compatibility](#23-browser-compatibility)
24. [Known Limitations](#24-known-limitations)
25. [Glossary of Terms](#25-glossary-of-terms)
26. [Appendix: Type Definitions](#26-appendix-type-definitions)
27. [Appendix: Algorithm Details](#27-appendix-algorithm-details)

---

## 1. Executive Summary

### 1.1 Project Overview

The Smart Ads System is an intelligent, real-time demographic-targeted advertising platform that dynamically selects and plays video advertisements based on the detected characteristics of viewers. Using advanced computer vision and machine learning algorithms running entirely in the browser, the system captures and analyzes the audience in front of a display screen, classifies viewers by gender and age group, and automatically reorders the advertisement queue to prioritize content most relevant to the current audience.

### 1.2 Key Features

- **Real-time Face Detection**: Instant detection of faces in video streams using neural network models
- **Demographic Classification**: Accurate age group (Kid, Young, Adult) and gender (Male, Female) classification
- **Dynamic Ad Targeting**: Automatic queue prioritization based on detected audience demographics
- **Privacy-First Architecture**: All processing occurs locally in the browser; no data is transmitted externally
- **Multi-Source Input**: Supports webcam, video file upload, and screen capture for detection
- **CCTV Optimization**: Specialized preprocessing and multi-pass detection for challenging surveillance footage
- **Model Evaluation Dashboard**: Built-in tools for labeling ground truth and measuring detection accuracy
- **Customizable Settings**: Extensive configuration options for sensitivity, bias correction, and preprocessing

### 1.3 Target Use Cases

- Digital signage in retail environments
- Smart advertising displays in public spaces
- Shopping mall information kiosks
- Transportation hub advertising screens
- Any scenario requiring audience-aware content delivery

---

## 2. Project Purpose and Concept

### 2.1 Problem Statement

Traditional digital advertising displays show content in a fixed rotation regardless of who is watching. This results in:

- Irrelevant ads shown to viewers (e.g., children's toy ads to adults)
- Wasted advertising impressions
- Reduced engagement and effectiveness
- No feedback loop for content optimization

### 2.2 Solution Overview

The Smart Ads System solves this by creating a closed-loop feedback system:

1. **Capture**: A camera captures viewers during a configurable window of each advertisement
2. **Detect**: Neural network models identify and locate faces in the video stream
3. **Classify**: Each detected face is classified by age group and gender
4. **Aggregate**: Demographics are compiled across all unique viewers in the capture session
5. **Prioritize**: The ad queue is reordered to show content matching the detected audience
6. **Play**: The most relevant advertisement plays next
7. **Repeat**: The cycle continues, constantly adapting to the current audience

### 2.3 Privacy-First Approach

The system is designed with privacy as a core principle:

- **Local Processing Only**: All face detection and demographic classification runs entirely within the user's browser using TensorFlow.js
- **No Data Transmission**: No images, video frames, or demographic data leave the device
- **No Persistent Storage of Faces**: Face data exists only in memory during the active session
- **No Personal Identification**: The system classifies demographics, not individuals
- **No Facial Recognition**: The system cannot and does not attempt to identify specific people

---

## 3. System Architecture Overview

### 3.1 High-Level Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Input Sources   |     |  Detection Engine |     |   Ad Management   |
|                   |     |                   |     |                   |
| - Webcam          |---->| - Face Detection  |---->| - Queue Scoring   |
| - Video File      |     | - Demographics    |     | - Queue Reorder   |
| - Screen Capture  |     | - Tracking        |     | - Ad Selection    |
+-------------------+     +-------------------+     +-------------------+
         |                        |                         |
         v                        v                         v
+-------------------+     +-------------------+     +-------------------+
|   Preprocessing   |     |   Stabilization   |     |   Video Player    |
|                   |     |                   |     |                   |
| - Gamma Correct   |     | - Temporal Voting |     | - HTML5 Video     |
| - Contrast Adj.   |     | - IoU Matching    |     | - Capture Window  |
| - Sharpening      |     | - Vote Aggregation|     | - Progress Bar    |
| - Denoising       |     | - Bias Correction |     | - Controls        |
+-------------------+     +-------------------+     +-------------------+
         |                        |                         |
         v                        v                         v
+------------------------------------------------------------------------+
|                              User Interface                             |
|                                                                        |
| - Landing Page (/) - Hero, Features, Team Information                  |
| - Dashboard (/dashboard) - Main Application with all controls          |
| - Evaluation (/admin/evaluation) - Protected accuracy analysis         |
+------------------------------------------------------------------------+
```

### 3.2 Client-Side Only Design

The system is implemented as a pure client-side web application with zero backend dependencies:

- **No Server Required**: The application runs entirely in the browser
- **No API Calls**: All intelligence is embedded in the frontend
- **Offline Capable**: Once loaded, the application functions without internet connectivity
- **Static Hosting**: Can be deployed to any static file hosting service

### 3.3 Browser-Based AI Inference

Machine learning inference occurs directly in the browser using:

- **TensorFlow.js**: The JavaScript implementation of TensorFlow providing neural network execution
- **WebGL Backend**: GPU-accelerated tensor operations for fast inference
- **Pre-trained Models**: Optimized face detection and demographic classification models

### 3.4 Data Flow

```
Camera Frame
     |
     v
+--------------------+
| Image Preprocessing|  (Gamma, Contrast, Sharpen, Denoise)
+--------------------+
     |
     v
+--------------------+
| Face Detection     |  (TinyFace / SSD Mobilenet)
+--------------------+
     |
     v
+--------------------+
| Filtering          |  (Size, Aspect, Score thresholds)
+--------------------+
     |
     v
+--------------------+
| Age/Gender         |  (AgeGenderNet classification)
| Classification     |
+--------------------+
     |
     v
+--------------------+
| Bias Correction    |  (Female boost, Hair heuristics)
+--------------------+
     |
     v
+--------------------+
| Temporal Tracking  |  (IoU matching, Vote aggregation)
+--------------------+
     |
     v
+--------------------+
| Demographics       |  (Session summary, Counts)
| Aggregation        |
+--------------------+
     |
     v
+--------------------+
| Queue Scoring      |  (Match scoring, Penalty application)
+--------------------+
     |
     v
+--------------------+
| Ad Selection       |  (Top 2 most relevant ads)
+--------------------+
```

---

## 4. Technology Stack

### 4.1 Frontend Framework

#### React 18.3.1

React serves as the foundation of the user interface:

- **Component Architecture**: The UI is built from reusable, composable components
- **Hooks System**: State management, side effects, and custom logic through React hooks
- **Functional Components**: Modern React patterns using function components throughout
- **Virtual DOM**: Efficient UI updates through React's diffing algorithm

Key React features utilized:
- `useState`: Local component state management
- `useEffect`: Side effects like model loading and detection loops
- `useCallback`: Memoized callbacks for performance
- `useMemo`: Computed values that update only when dependencies change
- `useRef`: References to DOM elements and mutable values

#### TypeScript 5.8.3

TypeScript provides static typing for enhanced developer experience and code reliability:

- **Interface Definitions**: Strong typing for all data structures
- **Type Safety**: Compile-time error checking prevents runtime type errors
- **IDE Support**: Enhanced autocomplete and documentation
- **Refactoring Support**: Safe code modifications with type checking

#### Vite 5.4.19

Vite serves as the build tool and development server:

- **Hot Module Replacement (HMR)**: Instant updates during development
- **ES Module Based**: Native ESM for fast development startup
- **Optimized Production Builds**: Rollup-based bundling for production
- **Plugin Ecosystem**: Extensible through plugins

Configuration (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 4.2 Styling and UI

#### Tailwind CSS 3.4.17

Tailwind provides a utility-first CSS framework:

- **Utility Classes**: Rapid styling through pre-defined utility classes
- **Responsive Design**: Built-in responsive modifiers (sm:, md:, lg:, etc.)
- **Dark Mode**: Native dark mode support via the `dark:` prefix
- **Custom Configuration**: Extended through `tailwind.config.ts`

Custom extensions include:
- Custom fonts (JetBrains Mono for display, Inter for body)
- Extended color palette with semantic colors (success, warning, info)
- Custom animations (pulse-glow, accordion-down/up)
- Sidebar component colors

#### shadcn/ui Components

shadcn/ui provides high-quality, accessible UI components built on Radix UI primitives:

**Component Library Includes**:
- Form controls (Button, Input, Select, Slider, Switch, Checkbox)
- Layout components (Card, Dialog, Sheet, Tabs)
- Feedback components (Toast, Alert, Progress)
- Navigation (NavigationMenu, Breadcrumb)
- Data display (Table, Badge, Avatar)

Each component is:
- Fully accessible (ARIA compliant)
- Customizable through Tailwind classes
- Composable with other components

#### CSS Custom Properties

The design system uses CSS custom properties for dynamic theming:

Light Mode Variables:
```css
:root {
  --background: 210 40% 98%;
  --foreground: 222 47% 11%;
  --primary: 199 89% 42%;
  --accent: 280 70% 50%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --destructive: 0 72% 51%;
}
```

Dark Mode Variables:
```css
.dark {
  --background: 222 47% 6%;
  --foreground: 210 40% 96%;
  --primary: 199 89% 48%;
  --accent: 280 70% 55%;
}
```

### 4.3 AI/Machine Learning Libraries

#### TensorFlow.js 4.22.0

TensorFlow.js is the core inference engine:

- **Neural Network Execution**: Runs pre-trained models in the browser
- **WebGL Backend**: GPU-accelerated computations for real-time performance
- **CPU Fallback**: Automatic fallback when WebGL is unavailable
- **Memory Management**: Tensor disposal to prevent memory leaks

Backend initialization:
```typescript
await tf.setBackend('webgl');
await tf.ready();
```

#### face-api.js 0.22.2

face-api.js provides the face detection and demographic classification pipeline:

**Models Included**:

1. **TinyFaceDetector** (~200KB)
   - Ultra-fast face detection
   - Based on MobileNetV1 architecture
   - Configurable input size (160-608px)
   - Score threshold for filtering

2. **SSD Mobilenet V1** (~5MB)
   - Higher accuracy face detection
   - Single Shot Detector architecture
   - Better for challenging angles/lighting
   - Configurable minimum confidence

3. **AgeGenderNet** (~400KB)
   - Simultaneous age and gender prediction
   - Returns numeric age and gender probability
   - Runs on detected face regions

Usage pattern:
```typescript
const detections = await faceapi
  .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.2,
  }))
  .withAgeAndGender();
```

### 4.4 Supporting Libraries

#### React Router DOM 6.30.1

Client-side routing for the single-page application:

- **BrowserRouter**: HTML5 history-based routing
- **Route Components**: Declarative route definitions
- **Navigation Hooks**: `useNavigate` for programmatic navigation
- **Link Component**: Accessible navigation links

Routes defined:
```typescript
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/dashboard" element={<Index />} />
  <Route path="/admin/evaluation" element={<ModelEvaluation />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

#### TanStack Query (React Query) 5.83.0

Data fetching and caching library (available for future API integration):

- **Query Caching**: Automatic caching of fetched data
- **Background Refetching**: Stale data refreshed automatically
- **Mutation Handling**: Optimistic updates for mutations

#### Lucide React

Icon library providing consistent, customizable icons:

- **Tree-shakable**: Only used icons are bundled
- **Customizable**: Size, color, stroke width properties
- **Consistent Design**: Unified icon style throughout the app

Icons used extensively: Camera, Eye, Users, Settings, Play, Pause, SkipForward, etc.

#### Sonner

Toast notification library for user feedback:

- **Non-blocking Notifications**: Unobtrusive user alerts
- **Multiple Types**: Success, error, info, warning variants
- **Auto-dismiss**: Configurable display duration

#### React Helmet Async

SEO and document head management:

- **Meta Tags**: Dynamic title and description
- **Accessibility**: Proper document semantics

---

## 5. AI Detection System

### 5.1 Model Architecture

#### TinyFaceDetector

**Purpose**: Fast, lightweight face detection for real-time applications

**Architecture**:
- Based on depthwise separable convolutions
- MobileNetV1 backbone optimized for speed
- Single-shot detection head

**Characteristics**:
- Model size: ~200KB (shard files)
- Inference time: 20-50ms per frame
- Configurable input size: 160, 224, 320, 416, 512, 608 pixels
- Score threshold: 0.1-0.6 (lower = more detections, higher = stricter)

**Best For**:
- Webcam input with good lighting
- Real-time applications
- Close-range face detection

**Limitations**:
- Struggles with small faces (<50px)
- Lower accuracy in challenging lighting
- May miss faces at extreme angles

#### SSD Mobilenet V1

**Purpose**: High-accuracy face detection for challenging conditions

**Architecture**:
- Single Shot Detector (SSD) framework
- MobileNetV1 feature extractor
- Multi-scale feature maps for different face sizes

**Characteristics**:
- Model size: ~5MB (split across 2 shard files)
- Inference time: 50-100ms per frame
- Minimum confidence threshold: 0.1-0.6

**Best For**:
- CCTV and surveillance footage
- Small or distant faces
- Challenging lighting conditions
- Crowds and multiple faces

**Limitations**:
- Slower inference than TinyFace
- Larger model download
- Higher memory usage

#### AgeGenderNet

**Purpose**: Demographic classification of detected faces

**Architecture**:
- Convolutional neural network
- Multi-task learning (age and gender simultaneously)
- Softmax output for gender probability

**Outputs**:
- **Age**: Numeric value (0-100 range)
- **Gender**: 'male' or 'female' with probability score
- **Gender Probability**: Confidence (0.0-1.0)

**Age Group Mapping**:
```typescript
if (age < 13) ageGroup = 'kid';
else if (age < 35) ageGroup = 'young';
else ageGroup = 'adult';
```

**Known Biases**:
- Tends to predict 'male' more frequently
- Age estimation less accurate for non-frontal faces
- Performance varies across ethnicities

### 5.2 Detection Pipeline

The detection system implements a sophisticated multi-pass strategy optimized for different input conditions:

#### Pass 1: Multi-Scale Detection

The first pass runs detection at multiple input sizes to capture faces of varying sizes:

```typescript
const pass1Scales = isCCTV ? [320, 416, 512, 608] : [416, 512];
```

**Process**:
1. For each scale, resize input to target dimension
2. Run face detection model
3. Collect all detections across scales
4. In dual mode, also run SSD Mobilenet
5. Merge detections using IoU-based deduplication

#### Pass 2: Rescue Pass (CCTV Only)

When Pass 1 yields few detections and enhanced mode is enabled:

**Aggressive Preprocessing**:
```typescript
const aggressivePreprocessing = {
  gamma: 1.5,      // Brighten shadows
  contrast: 1.6,   // Increase dynamic range
  sharpen: 0.5,    // Edge enhancement
  denoise: true,   // Reduce noise
};
```

**Process**:
1. Apply aggressive preprocessing to input
2. Upscale by configuration factor (up to 2.5x)
3. Run detection at multiple scales
4. Run SSD if available
5. Merge with Pass 1 results

#### Pass 3: Ultra-Low Threshold Scan (CCTV Only)

Final rescue attempt for extremely difficult footage:

**Settings**:
- Ultra-low threshold: 0.08
- Maximum preprocessing (gamma 1.8, contrast 2.0)
- 2.5x upscale
- Stricter post-filtering (min score 0.20)

**Process**:
1. Apply maximum preprocessing and upscale
2. Run detection with ultra-low threshold
3. Filter to keep only higher-scoring candidates
4. Apply strict size and aspect ratio validation
5. Merge with existing detections

### 5.3 Demographic Classification

After face detection, each detected face region is analyzed for demographics:

#### Classification Process

1. Extract face region from frame using bounding box
2. Pass to AgeGenderNet model
3. Receive age (numeric) and gender (with probability)
4. Map age to age group category
5. Apply bias corrections (female boost, hair heuristics)
6. Add to temporal voting system

#### Age Group Categories

| Category | Age Range | Description |
|----------|-----------|-------------|
| Kid | 0-12 | Children |
| Young | 13-34 | Teenagers and young adults |
| Adult | 35+ | Adults |

#### Gender Classification

The model outputs:
- `gender`: 'male' or 'female' (classification)
- `genderProbability`: 0.0-1.0 (confidence)

Interpretation:
- Probability >0.5 = classified as that gender
- Probability near 0.5 = uncertain classification
- Probability near 1.0 = high confidence

### 5.4 Temporal Tracking

The system implements temporal tracking to maintain stable identities across frames:

#### IoU-Based Face Matching

For each tracked face from the previous frame:
1. Calculate IoU with all new detections
2. Calculate center distance
3. Predict position based on velocity
4. Score matches: IoU * 0.6 + distance_score * 0.4
5. Assign best match if score exceeds threshold

**IoU Calculation**:
```typescript
const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
const union = area1 + area2 - intersection;
const iou = union > 0 ? intersection / union : 0;
```

#### Velocity Prediction

Each tracked face maintains velocity estimates:
```typescript
velocity: { vx: number; vy: number }
```

During occlusion (missed frames), position is predicted:
```typescript
trackedFace.boundingBox.x += trackedFace.velocity.vx * 0.5;
trackedFace.boundingBox.y += trackedFace.velocity.vy * 0.5;
```

#### Vote Aggregation

Demographics are stabilized through temporal voting:

```typescript
genderVotes: { male: number; female: number };
ageVotes: { kid: number; young: number; adult: number };
```

**Vote Weight Calculation**:
```typescript
const voteWeight = detection.confidence * Math.min(detection.faceScore, 1);
```

**Stable Classification**:
```typescript
function getStableGender(votes, previous) {
  const total = votes.male + votes.female;
  if (total < 0.9) return previous;  // Not enough evidence
  
  const diff = Math.abs(votes.female - votes.male);
  if (diff < 0.25) return previous;  // Too close to call
  
  return votes.female > votes.male ? 'female' : 'male';
}
```

---

## 6. User Interface Components

### 6.1 Landing Page (`/`)

The landing page serves as the entry point and marketing surface:

#### Hero Section
- Animated logo with glow effects
- Gradient text headline: "Smart Advertising Powered by AI"
- Tagline: "See Your Audience. Reach Every Viewer."
- Call-to-action buttons: "Launch Demo" and "Learn More"
- Stats preview grid (Detection Accuracy, Processing Time, Age Groups, Privacy Compliance)
- Animated background with gradient orbs

#### About Section
- Feature grid (6 cards):
  - Real-time Detection
  - Demographic Analysis
  - Smart Targeting
  - Lightning Fast
  - Privacy First
  - AI Powered
- "How It Works" flow diagram:
  - Detect -> Analyze -> Score -> Display

#### Technology Section
- Demo visualization with action screenshot
- Technology stack badges (TensorFlow.js, face-api.js, React, WebGL, TypeScript)

#### Team Section
- Team member cards with photos
- Roles: Project Lead, Creative Lead, Research Lead

#### Footer
- Copyright information
- Navigation links

### 6.2 Main Dashboard (`/dashboard`)

The dashboard is the core application interface:

#### Layout Structure

```
+------------------------------------------------------------------+
|  Header: Logo, Nav Tabs, Theme Toggle, Back Link                 |
+------------------------------------------------------------------+
|                    |                                              |
|  Video Player      |  Webcam Preview / Detection Preview         |
|  (Primary display) |  (Canvas with bounding boxes)               |
|                    |                                              |
+--------------------+----------------------------------------------+
|                    |                    |                         |
|  Demographic Stats |  Ad Queue          |  Settings Button        |
|  (Gender/Age bars) |  (Next 2 ads)      |  (Opens panel)          |
|                    |                    |                         |
+--------------------+--------------------+-------------------------+
|                                                                   |
|  System Logs (Scrollable log entries)                            |
|                                                                   |
+------------------------------------------------------------------+
|  Input Source Selector | Test Mode Toggle | Manual Mode Toggle   |
+------------------------------------------------------------------+
```

#### Header Controls
- Logo and brand name
- Navigation tabs (Dashboard, Ad Manager, Settings)
- Theme toggle (light/dark mode)
- Link back to landing page

#### Main Content Area
- **Left Panel**: Video Player showing current advertisement
- **Right Panel**: Webcam/Detection Preview with live face detection overlay

#### Statistics Section
- **Demographic Stats**: Visual bars showing detected gender/age distribution
- **Ad Queue**: Displays next 2 advertisements with targeting info
- **Capture Session Summary**: Shows results after capture window ends

#### Control Section
- **Input Source Selector**: Choose between Webcam, Video File, Screen Capture
- **Test Mode**: Start/stop continuous detection
- **Manual Mode**: Disable detection, play ads from custom playlist
- **Labeling Mode**: Enable ground truth labeling for evaluation
- **Debug Mode**: Show detection metrics overlay

### 6.3 Video Player Component

The video player displays advertisements with custom controls:

#### Features
- HTML5 video element with autoplay support
- Custom control overlay (appears on hover)
- Play/Pause button with icon toggle
- Skip to next ad button
- Volume/Mute toggle
- Time display (current / total)
- Progress bar with:
  - Fill indicating playback position
  - Highlight showing capture window region
  - Draggable handle

#### Capture Indicator
During active capture windows:
- Red "SCANNING" badge in corner
- Pulsing border effect
- Animated scan line

#### Ad Info Overlay
- Ad title
- Target demographics (gender and age group)

### 6.4 Detection Preview (WebcamPreview)

The detection preview shows the live video feed with overlaid detection results:

#### Features
- Live video display from selected source
- Canvas overlay for drawing bounding boxes
- Source indicator (Webcam/Video/Screen icons)
- Detection count badge
- Status indicator (Ready/Scanning/Off)

#### Bounding Box Rendering
Each detected face shows:
- Colored rectangle (green = high confidence, yellow = medium, red = low)
- Label with gender symbol, age group, confidence percentage
- Semi-transparent fill

**Color Coding**:
- Green: Confidence >= 0.85
- Yellow/Blue: 0.75 <= Confidence < 0.85
- Red: Confidence < 0.75
- Blue: Already labeled (in labeling mode)

#### Zoom Controls
- None: No zoom
- Auto: Automatically zoom to detected faces
- Manual: Adjustable zoom level (1x-4x)

#### Labeling Mode
When enabled:
- Click on faces to open labeling form
- Select correct gender (Male/Female)
- Select correct age group (Kid/Young/Adult)
- Mark as False Positive if not a real face
- Save to evaluation session

### 6.5 Settings Panel

The settings panel provides comprehensive control over detection behavior:

#### Detection Mode
- **Fast (Webcam)**: Quick detection for good lighting conditions
- **Accurate (CCTV)**: Balanced for security camera footage
- **Maximum (Crowd)**: Aggressive detection for busy scenes

#### Video Quality Preset
- **HD (720p+)**: Standard high-definition video
- **Low Quality CCTV**: Enhanced preprocessing for poor footage
- **Night/IR Camera**: Optimized for infrared and low-light
- **Crowd Detection**: Tuned for multiple small faces

#### Detection Threshold (Sensitivity)
- Range: 0.15 - 0.50
- Lower = more faces detected (but more false positives)
- Higher = stricter, only obvious faces

#### False Positive Guard
- Range: 0.10 - 0.70
- Hard floor for face score to reject walls/objects
- Increase if seeing "ghost" detections

#### Demographic Confidence
- Range: 55% - 90%
- Minimum confidence to count in demographics
- Higher = only very confident classifications counted

#### Female Boost Factor
- Range: 0.00 - 0.30
- Corrects AI's inherent male bias
- Increase if too many women classified as men

#### Hair Detection Heuristics
- Toggle: On/Off
- Analyzes hair region above face
- Provides additional gender signal

#### Require Face Texture
- Toggle: On/Off
- Validates skin texture to reject flat surfaces
- Can reject real faces in some conditions

#### Dual Model (Video)
- Toggle: On/Off
- Uses TinyFace + SSD Mobilenet together
- Maximum detection coverage

#### Enhanced Detection (Video)
- Toggle: On/Off
- Enables Pass 2/3 rescue passes
- Best for difficult CCTV footage

#### Capture Window
- Start: 10% - 90% of ad duration
- End: 20% - 98% of ad duration
- Defines when detection occurs during ad playback

### 6.6 Model Evaluation Dashboard (`/admin/evaluation`)

Password-protected dashboard for analyzing detection accuracy:

#### Authentication
- Passcode: `smartads1234`
- Session-based (survives page refresh within tab)

#### Session Management
- Create new evaluation sessions
- Select existing sessions
- View all sessions combined
- Export session data as CSV
- Clear session entries
- Delete sessions

#### Overview Metrics
- Total Samples: Number of labeled detections
- Gender Accuracy: Percentage correctly classified
- Female Recall: Percentage of females correctly detected
- False Positive Rate: Percentage of non-face detections

#### Detailed Metrics
- Male Recall and Precision
- Female Recall and Precision
- Age Accuracy (overall)
- Per-age-group accuracy (Kid, Young, Adult)
- Average Confidence (correct vs incorrect)

#### Confusion Matrices

**Gender Confusion Matrix (2x2)**:
```
              Actual Male   Actual Female
Predicted Male      TM-M          FM-M
Predicted Female    TM-F          FM-F
```

**Age Confusion Matrix (3x3)**:
```
              Actual Kid   Actual Young   Actual Adult
Predicted Kid     K-K          K-Y           K-A
Predicted Young   Y-K          Y-Y           Y-A
Predicted Adult   A-K          A-Y           A-A
```

#### Recommendations
Based on metrics, provides actionable suggestions:
- Low female recall: Increase Female Boost Factor
- High false positive rate: Increase False Positive Guard
- Good gender accuracy: Current settings working well
- Confident but wrong: Enable Hair Heuristics
- Low age accuracy: Known limitation, focus on gender

#### Entry Table
- Shows all labeled entries
- Detected vs Actual values
- Confidence and face score
- Delete individual entries

---

## 7. Ad Management System

### 7.1 Ad Metadata Structure

Each advertisement is defined by the `AdMetadata` interface:

```typescript
interface AdMetadata {
  id: string;            // Unique identifier
  filename: string;      // Video file name
  title: string;         // Display title
  gender: 'male' | 'female' | 'all';      // Target gender
  ageGroup: 'kid' | 'young' | 'adult' | 'all';  // Target age
  duration: number;      // Video length in seconds
  captureStart: number;  // Capture window start (seconds)
  captureEnd: number;    // Capture window end (seconds)
  thumbnail?: string;    // Optional thumbnail URL
  videoUrl: string;      // Video source URL
}
```

### 7.2 Sample Ads

The system includes 6 sample advertisements with diverse targeting:

| Title | Gender | Age | Duration |
|-------|--------|-----|----------|
| TechPro Gadgets | Male | Young | 15s |
| Elegance Fashion | Female | Adult | 15s |
| PowerBoost Energy | Male | Young | 60s |
| GlowUp Skincare | Female | Young | 15s |
| WealthGuard Insurance | All | Adult | 53s |
| NexGen Gaming | All | Young | 60s |

### 7.3 Ad Queue Scoring Algorithm

The queue is reordered based on detected demographics using a scoring system:

#### Score Calculation

```typescript
function scoreAd(ad: AdMetadata, demographics: DemographicCounts): AdScore {
  let score = 0;
  
  // Determine dominant demographics
  const dominantGender = demographics.male >= demographics.female ? 'male' : 'female';
  const dominantAge = /* highest count among kid, young, adult */;
  
  // Perfect match: both gender AND age match exactly
  if (ad.gender === dominantGender && ad.ageGroup === dominantAge) {
    score += 10;
  }
  // Both match (including 'all' values)
  else if (genderMatches && ageMatches) {
    score += 5;
  }
  // Only gender matches
  else if (ad.gender === dominantGender) {
    score += 3;
  }
  // Only age matches
  else if (ad.ageGroup === dominantAge) {
    score += 3;
  }
  // Neither matches
  else {
    score -= 5;
  }
  
  // Recently played penalty
  if (ad.id === lastPlayedAdId) {
    score -= 3;
  }
  
  return { ad, score, reasons };
}
```

#### Queue Reordering

1. Score all available ads
2. Sort by score (descending)
3. Take top 2 ads for the queue
4. Display in order of relevance

### 7.4 Capture Session Flow

The capture window determines when demographic detection occurs:

#### Timeline

```
|------ Ad Duration ------|
|     |===Capture===|     |
     Start         End
     (e.g., 60%)   (e.g., 100%)
```

#### Process

1. **Ad Starts**: Video begins playing
2. **Pre-Capture**: Detection inactive, viewers accumulate
3. **Capture Start**: When `currentTime >= captureStart`
   - Camera/source activated
   - Detection loop starts
   - Demographics reset to zero
4. **During Capture**: Every ~800ms
   - Detect faces in frame
   - Classify demographics
   - Update tracked faces
   - Aggregate votes
5. **Capture End**: When `currentTime >= captureEnd`
   - Detection loop stops
   - Session summary generated
   - Queue reordered based on demographics
6. **Ad Ends**: Next ad from queue plays

---

## 8. Input Source Management

### 8.1 Webcam Input

The system supports live webcam input via the MediaDevices API:

#### Implementation

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { 
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user'
  }
});
videoRef.current.srcObject = stream;
await videoRef.current.play();
```

#### Characteristics
- Resolution: 640x480 (configurable)
- Front-facing camera preference
- Real-time video stream
- Detection mode: TinyFace only (prevents ghost detections)

#### Error Handling
- Permission denied: Display error message
- Camera unavailable: Suggest alternative input

### 8.2 Video File Input

Users can upload video files for detection:

#### Implementation

```typescript
const url = URL.createObjectURL(file);
videoRef.current.src = url;
videoRef.current.loop = true;  // Continuous detection
videoRef.current.muted = true;
await videoRef.current.play();
```

#### Characteristics
- Supported formats: MP4, WebM, etc. (browser-dependent)
- Loop playback enabled
- Muted to prevent audio issues
- Detection mode: Dual (TinyFace + SSD)
- CCTV mode: Forced ON

### 8.3 Screen Capture

Capture any window or screen for detection:

#### Implementation

```typescript
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: false
});
```

#### Characteristics
- User selects window/screen to capture
- Higher resolution support (up to 1080p)
- Detection mode: Dual (TinyFace + SSD)
- CCTV mode: Forced ON

#### Event Handling
Detects when user stops sharing via browser UI:
```typescript
stream.getVideoTracks()[0].onended = () => {
  stopCurrentSource();
  setError('Screen sharing stopped');
};
```

---

## 9. Image Preprocessing Pipeline

### 9.1 Enhancement Techniques

The preprocessing pipeline enhances video frames before detection:

#### Gamma Correction

Adjusts brightness by applying a power-law transformation:

```typescript
function applyGamma(data: Uint8ClampedArray, gamma: number): void {
  const gammaLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaLUT[i] = Math.round(255 * Math.pow(i / 255, 1 / gamma));
  }
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gammaLUT[data[i]];        // R
    data[i + 1] = gammaLUT[data[i + 1]]; // G
    data[i + 2] = gammaLUT[data[i + 2]]; // B
  }
}
```

- Gamma < 1.0: Darkens image
- Gamma = 1.0: No change
- Gamma > 1.0: Brightens shadows

#### Contrast Adjustment

Increases or decreases the dynamic range:

```typescript
function applyContrast(data: Uint8ClampedArray, contrast: number): void {
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(factor * (data[i] - 128) + 128);
    data[i + 1] = Math.round(factor * (data[i + 1] - 128) + 128);
    data[i + 2] = Math.round(factor * (data[i + 2] - 128) + 128);
  }
}
```

- Contrast < 1.0: Reduces range
- Contrast = 1.0: No change
- Contrast > 1.0: Increases range

#### Sharpening

Applies a convolution kernel for edge enhancement:

```typescript
// Sharpen kernel (strength = sharpen factor)
const kernel = [
  0, -strength, 0,
  -strength, 1 + 4 * strength, -strength,
  0, -strength, 0
];
```

#### Denoising

Simple 3x3 box blur to reduce noise:

```typescript
// Average 9 neighboring pixels
for (let ky = -1; ky <= 1; ky++) {
  for (let kx = -1; kx <= 1; kx++) {
    sum += data[neighborIndex];
  }
}
output[centerIndex] = sum / 9;
```

### 9.2 Presets

Pre-configured enhancement profiles:

| Preset | Gamma | Contrast | Sharpen | Denoise |
|--------|-------|----------|---------|---------|
| None | 1.0 | 1.0 | 0 | false |
| Indoor | 1.2 | 1.3 | 0.3 | false |
| Outdoor | 1.0 | 1.1 | 0.2 | false |
| Night/IR | 1.5 | 1.5 | 0.4 | true |
| Low Light | 1.8 | 1.4 | 0.5 | true |
| Low Quality CCTV | 1.4 | 1.5 | 0.5 | true |
| Crowd | 1.3 | 1.4 | 0.4 | true |

---

## 10. Detection Filtering and False Positive Prevention

### 10.1 Filter Criteria

Multiple filters are applied to raw detections:

#### Minimum Face Score
```typescript
if (faceScore < requiredMinScore) {
  return false; // Reject low-confidence detections
}
```
- Default threshold: 0.10 (CCTV), 0.15 (Webcam)
- Hard floor (False Positive Guard): 0.15-0.70

#### Minimum Pixel Size
```typescript
if (faceWidth < config.minFaceSizePx || faceHeight < config.minFaceSizePx) {
  return false; // Too small
}
```
- Default: 12 pixels minimum dimension

#### Minimum Percentage of Frame
```typescript
const facePercent = (faceWidth * faceHeight) / (videoWidth * videoHeight) * 100;
if (facePercent < config.minFaceSizePercent) {
  return false; // Too small relative to frame
}
```
- Default: 0.05% of frame area

#### Maximum Size (Wall Rejection)
```typescript
if (facePercent > 35) {
  return false; // Too large - likely wall or background
}
```

#### Aspect Ratio Bounds
```typescript
const aspectRatio = faceWidth / faceHeight;
if (aspectRatio < 0.25 || aspectRatio > 4.0) {
  return false; // Unrealistic face shape
}
```
- Wide range accommodates angled/occluded faces

#### Bounding Box in Frame
```typescript
if (faceX < 0 || faceY < 0 || 
    faceX + faceWidth > videoWidth || 
    faceY + faceHeight > videoHeight) {
  return false; // Out of bounds
}
```

### 10.2 Texture Validation

Optional check to filter uniform surfaces:

#### Edge Density Check
```typescript
function hasTextureVariation(canvas, boundingBox): boolean {
  // Calculate horizontal edge differences
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const diff = Math.abs(pixel1 - pixel2) + ...;
      if (diff > 50) edgeCount++;
    }
  }
  
  const edgeRatio = edgeCount / totalChecked;
  return edgeRatio > 0.03; // At least 3% edges
}
```

#### Skin Tone Detection
```typescript
function hasSkinTones(canvas, boundingBox): boolean {
  // Sample center of face region
  // Check for skin-like RGB patterns
  const isSkin = (
    r > 60 && r < 250 &&
    g > 40 && g < 220 &&
    b > 20 && b < 200 &&
    Math.abs(r - g) < 80 &&
    r >= g && g >= b * 0.8
  );
  
  return skinRatio > 0.15; // At least 15% skin pixels
}
```

---

## 11. Gender Bias Correction

### 11.1 The Problem

The face-api.js AgeGenderNet model exhibits a systematic bias toward predicting 'male':

**Observed Issues**:
- Females are misclassified as male 20-40% of the time
- Bias is stronger for:
  - Faces with short hair
  - Faces at angles
  - Lower resolution faces
- The model tends to default to 'male' when uncertain

### 11.2 Solutions Implemented

#### Female Boost Factor

A configurable boost applied to female classifications:

```typescript
function applyFemaleBoost(rawGender, rawConfidence, femaleBoostFactor, hairScore) {
  // Only apply in uncertain range (0.45 - 0.70)
  if (rawConfidence < 0.45 || rawConfidence > 0.70) {
    return { gender: rawGender, confidence: rawConfidence };
  }
  
  // Calculate adjusted female probability
  let femaleProb = rawGender === 'female' ? rawConfidence : (1 - rawConfidence);
  
  // Apply boost based on hair score and boost factor
  const boost = femaleBoostFactor * (0.3 + hairScore * 0.7);
  femaleProb = Math.min(0.95, femaleProb + boost);
  
  // Determine final classification
  if (femaleProb > 0.5) {
    return { gender: 'female', confidence: femaleProb };
  } else {
    return { gender: 'male', confidence: 1 - femaleProb };
  }
}
```

**Proportional Application**:
The boost is scaled by uncertainty:
```typescript
const confidenceScale = Math.max(0, 1 - (detection.confidence - 0.5) * 2);
const effectiveBoost = femaleBoostFactor * confidenceScale;
```
- At 50% confidence: Full boost applied
- At 75% confidence: Half boost
- At 100% confidence: No boost

#### Hair Region Analysis

Secondary signal based on hair presence:

```typescript
function analyzeHairRegion(canvas, boundingBox, debugMode): number {
  // Sample region above face (hair region)
  const hairRegionHeight = boundingBox.height * 0.4;
  
  // Sample sides of face (long hair detection)
  const sideWidth = boundingBox.width * 0.4;
  
  // Count dark pixels (hair is typically darker)
  let darkPixelsAbove = 0;
  let darkPixelsSide = 0;
  
  for (pixel in samples) {
    const brightness = (r + g + b) / 3;
    if (brightness < 120) darkPixels++;
  }
  
  // Long hair = high side ratio
  const hairScore = aboveRatio * 0.4 + sideRatio * 0.6;
  return hairScore; // 0 = short/no hair, 1 = long hair
}
```

#### Face Shape Analysis

Aspect ratio provides weak gender signal:

```typescript
function analyzeFaceShape(boundingBox): number {
  const aspectRatio = boundingBox.height / boundingBox.width;
  
  // Males: ~1.0-1.2 (more square)
  // Females: ~1.2-1.4 (more oval)
  if (aspectRatio < 1.0) return 0.2;   // Very male-like
  if (aspectRatio < 1.15) return 0.35;
  if (aspectRatio < 1.25) return 0.5;  // Neutral
  if (aspectRatio < 1.35) return 0.65;
  return 0.8;  // Very female-like
}
```

---

## 12. Temporal Tracking and Stabilization

### 12.1 Face Tracking Across Frames

Each detected face is tracked across video frames using the `TrackedFace` structure:

```typescript
interface TrackedFace {
  id: string;                    // Unique tracking identifier
  boundingBox: FaceBoundingBox;  // Current position
  velocity: { vx: number; vy: number };  // Movement vector
  confidence: number;            // Classification confidence
  faceScore: number;             // Detection confidence
  gender: 'male' | 'female';     // Current frame classification
  ageGroup: 'kid' | 'young' | 'adult';
  consecutiveHits: number;       // Frames seen consecutively
  missedFrames: number;          // Frames since last seen
  firstSeenAt: number;           // Timestamp of first detection
  lastSeenAt: number;            // Timestamp of last detection
  detectorUsed: 'tiny' | 'ssd';  // Which model detected
  genderVotes: { male: number; female: number };
  ageVotes: { kid: number; young: number; adult: number };
  stableGender: 'male' | 'female';      // Vote-determined gender
  stableAgeGroup: 'kid' | 'young' | 'adult';  // Vote-determined age
  isUserCorrected?: boolean;     // True if manually labeled
}
```

### 12.2 Matching Algorithm

For each tracked face, find the best matching new detection:

```typescript
for (const [id, trackedFace] of tracked.entries()) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (let i = 0; i < results.length; i++) {
    const detection = results[i];
    
    // Calculate IoU overlap
    const iou = calculateIoU(detection.boundingBox, trackedFace.boundingBox);
    
    // Calculate center distance
    const distance = calculateCenterDistance(...);
    
    // Predict position based on velocity
    const predictedX = trackedFace.boundingBox.x + trackedFace.velocity.vx;
    const predictedY = trackedFace.boundingBox.y + trackedFace.velocity.vy;
    const predictedDistance = calculateCenterDistance(detection, predicted);
    
    // Use minimum distance
    const effectiveDistance = Math.min(distance, predictedDistance);
    
    // Reject if moved too far
    if (effectiveDistance > config.maxVelocityPx) continue;
    
    // Score: weighted combination
    const score = iou * 0.6 + Math.max(0, 1 - effectiveDistance / 200) * 0.4;
    
    if (score > bestScore && (iou > 0.2 || effectiveDistance < 80)) {
      bestScore = score;
      bestMatch = i;
    }
  }
  
  if (bestMatch !== null) {
    // Update tracked face with new detection
  }
}
```

### 12.3 Position Smoothing

Bounding box updates are smoothed to reduce jitter:

```typescript
const alpha = 0.7; // Smoothing factor

tracked.boundingBox = {
  x: old.x * (1 - alpha) + new.x * alpha,
  y: old.y * (1 - alpha) + new.y * alpha,
  width: old.width * (1 - alpha) + new.width * alpha,
  height: old.height * (1 - alpha) + new.height * alpha,
};

tracked.velocity = {
  vx: old.vx * 0.5 + (new.x - old.x) * 0.5,
  vy: old.vy * 0.5 + (new.y - old.y) * 0.5,
};
```

### 12.4 Missed Frame Handling

When a face is not detected in a frame:

```typescript
if (!matchedIds.has(id)) {
  trackedFace.missedFrames++;
  
  // Predict position during short occlusions
  if (trackedFace.missedFrames <= config.holdFrames / 2) {
    trackedFace.boundingBox.x += trackedFace.velocity.vx * 0.5;
    trackedFace.boundingBox.y += trackedFace.velocity.vy * 0.5;
  }
  
  // Remove if missed too many frames
  if (trackedFace.missedFrames > config.holdFrames) {
    tracked.delete(id);
  }
}
```

- Default hold frames: 8 (CCTV), 3 (Webcam)

---

## 13. Capture Session Aggregation

### 13.1 Session Structure

Each capture window creates a session that aggregates viewer data:

```typescript
interface CaptureSessionSummary {
  startedAt: number;       // Session start timestamp
  endedAt?: number;        // Session end timestamp
  totalFrames: number;     // Frames captured
  uniqueViewers: number;   // Distinct people detected
  demographics: {
    male: number;
    female: number;
    kid: number;
    young: number;
    adult: number;
  };
  viewers: ViewerAggregate[];  // Individual viewer data
}
```

### 13.2 Viewer Aggregation

Each unique viewer is tracked:

```typescript
interface ViewerAggregate {
  trackingId: string;
  genderVotes: { male: number; female: number };
  ageVotes: { kid: number; young: number; adult: number };
  seenFrames: number;
  bestFaceScore: number;
  bestConfidence: number;
  finalGender: 'male' | 'female';
  finalAgeGroup: 'kid' | 'young' | 'adult';
}
```

### 13.3 Session Completion

When capture ends:

```typescript
// Filter viewers seen in enough frames
const qualifiedViewers = Array.from(session.viewers.values())
  .filter(v => v.seenFrames >= MIN_FRAMES_FOR_SESSION);

// Calculate final demographics from aggregated votes
const demographics = {
  male: qualifiedViewers.filter(v => v.finalGender === 'male').length,
  female: qualifiedViewers.filter(v => v.finalGender === 'female').length,
  kid: qualifiedViewers.filter(v => v.finalAgeGroup === 'kid').length,
  young: qualifiedViewers.filter(v => v.finalAgeGroup === 'young').length,
  adult: qualifiedViewers.filter(v => v.finalAgeGroup === 'adult').length,
};

// Trigger queue reordering
reorderQueue(demographics);
```

---

## 14. Data Persistence

### 14.1 LocalStorage Keys

The application persists data using browser localStorage:

| Key | Purpose | Data Type |
|-----|---------|-----------|
| `smartads-custom-ads` | Custom ad library | `AdMetadata[]` |
| `smartads-manual-queue` | Manual playlist | `AdMetadata[]` |
| `smartads-evaluation-sessions` | Labeling data | `EvaluationSession[]` |

### 14.2 Session Storage

Temporary data for single browser session:

| Key | Purpose |
|-----|---------|
| `smartads-admin-authenticated` | Admin auth state |

### 14.3 Data Examples

**Custom Ads Storage**:
```json
[
  {
    "id": "custom-001",
    "filename": "my-ad.mp4",
    "title": "My Custom Ad",
    "gender": "female",
    "ageGroup": "young",
    "duration": 30,
    "captureStart": 18,
    "captureEnd": 28,
    "videoUrl": "https://example.com/my-ad.mp4"
  }
]
```

**Evaluation Session Storage**:
```json
[
  {
    "id": "session_1234567890",
    "name": "Session 2024-01-15",
    "createdAt": 1234567890000,
    "entries": [
      {
        "id": "entry_001",
        "timestamp": 1234567891000,
        "boundingBox": {"x": 100, "y": 50, "width": 80, "height": 100},
        "detectedGender": "male",
        "detectedAgeGroup": "young",
        "detectedConfidence": 0.82,
        "detectedFaceScore": 0.95,
        "actualGender": "female",
        "actualAgeGroup": "young",
        "isFalsePositive": false
      }
    ]
  }
]
```

---

## 15. File Structure and Organization

```
smart-ads-system/
├── public/
│   ├── models/                    # AI model files
│   │   ├── tiny_face_detector_model-shard1
│   │   ├── tiny_face_detector_model-weights_manifest.json
│   │   ├── ssd_mobilenetv1_model-shard1
│   │   ├── ssd_mobilenetv1_model-shard2
│   │   ├── ssd_mobilenetv1_model-weights_manifest.json
│   │   ├── age_gender_model-shard1
│   │   └── age_gender_model-weights_manifest.json
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── assets/                    # Static assets
│   │   ├── Final_Logo.png
│   │   ├── action.png
│   │   └── team/                  # Team member photos
│   │       ├── Sufiyan.jpg
│   │       ├── Aliyan.jpg
│   │       └── mahnoor.jpg
│   │
│   ├── components/                # React components
│   │   ├── ui/                    # shadcn/ui components (40+ files)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── slider.tsx
│   │   │   └── ...
│   │   ├── AdManager.tsx          # Ad library management
│   │   ├── AdQueue.tsx            # Queue display component
│   │   ├── CaptureSessionSummary.tsx
│   │   ├── DebugOverlay.tsx       # Detection metrics overlay
│   │   ├── DemographicStats.tsx   # Gender/age statistics
│   │   ├── InputSourceSelector.tsx
│   │   ├── ManualQueueEditor.tsx  # Custom playlist editor
│   │   ├── NavLink.tsx
│   │   ├── SettingsPanel.tsx      # Configuration dialog
│   │   ├── SystemLogs.tsx         # Log viewer
│   │   ├── ThemeProvider.tsx      # Theme context
│   │   ├── ThemeToggle.tsx        # Dark/light toggle
│   │   ├── VideoPlayer.tsx        # Ad video player
│   │   └── WebcamPreview.tsx      # Detection preview
│   │
│   ├── data/
│   │   └── sampleAds.ts           # Demo ad definitions
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-mobile.tsx         # Mobile detection
│   │   ├── use-toast.ts           # Toast notifications
│   │   ├── useAdQueue.ts          # Queue management
│   │   ├── useFaceDetection.ts    # Core detection engine
│   │   ├── useHybridDetection.ts  # YOLO + face-api hybrid
│   │   ├── useWebcam.ts           # Input source management
│   │   └── useYoloFaceDetection.ts
│   │
│   ├── lib/
│   │   └── utils.ts               # Utility functions (cn)
│   │
│   ├── pages/                     # Page components
│   │   ├── Index.tsx              # Dashboard wrapper
│   │   ├── LandingPage.tsx        # Home page
│   │   ├── ModelEvaluation.tsx    # Admin dashboard
│   │   ├── NotFound.tsx           # 404 page
│   │   └── SmartAdsSystem.tsx     # Main application
│   │
│   ├── types/                     # TypeScript types
│   │   ├── ad.ts                  # Ad-related interfaces
│   │   ├── detection.ts           # Detection interfaces
│   │   └── evaluation.ts          # Evaluation metrics
│   │
│   ├── utils/                     # Utility functions
│   │   ├── genderHeuristics.ts    # Bias correction
│   │   ├── imagePreprocessing.ts  # CCTV enhancement
│   │   └── yoloModelDownloader.ts # Model management
│   │
│   ├── App.css                    # Additional styles
│   ├── App.tsx                    # Root component
│   ├── index.css                  # Global styles and theme
│   ├── main.tsx                   # Application entry
│   └── vite-env.d.ts              # Vite type declarations
|
├── components.json                # shadcn/ui configuration
├── eslint.config.js               # ESLint configuration
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── postcss.config.js              # PostCSS configuration
├── README.md                      # Basic documentation
├── SETTINGS.md                    # Settings guide
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.app.json              # App-specific TS config
├── tsconfig.node.json             # Node-specific TS config
└── vite.config.ts                 # Vite configuration
```

---

## 16. Configuration Files

### 16.1 vite.config.ts

Build tool configuration:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Key settings:
- Server on port 8080, all interfaces
- React plugin with SWC for fast compilation
- Path alias `@` -> `./src`

### 16.2 tailwind.config.ts

Styling configuration:

```typescript
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        // Semantic color tokens
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        destructive: "hsl(var(--destructive))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        // ... etc
      },
      keyframes: {
        "pulse-glow": { /* ... */ },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 16.3 tsconfig.json

TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "strict": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 16.4 package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  }
}
```

---

## 17. Detection Modes Explained

### 17.1 Webcam Mode

Optimized for live webcam input with good lighting:

| Setting | Value | Reason |
|---------|-------|--------|
| Detector | TinyFace only | Prevents ghost detections |
| CCTV Mode | OFF (forced) | No preprocessing needed |
| Sensitivity | 0.20 | Moderate strictness |
| Min Face Score | 0.15 | Accept reasonably confident |
| Min Face Size | 12px | Allow moderate distance |
| Hold Frames | 3 | Short persistence |
| Rescue Passes | OFF | Not needed |

### 17.2 Video/Screen Mode

Optimized for recorded footage and screen capture:

| Setting | Value | Reason |
|---------|-------|--------|
| Detector | Dual (Tiny + SSD) | Maximum coverage |
| CCTV Mode | ON (forced) | Enable preprocessing |
| Sensitivity | 0.15 | Very permissive |
| Min Face Score | 0.10 | Accept low confidence |
| Min Face Size | 12px | Accept small faces |
| Hold Frames | 8 | Long persistence |
| Rescue Passes | Enabled if Enhanced ON | For difficult footage |

### 17.3 Enhanced Detection Mode

When "Enhanced Detection (Video)" is toggled ON:

- Pass 2 (Rescue) always runs
- Pass 3 (Ultra-low threshold) enabled
- Aggressive preprocessing applied
- Higher upscale factors used
- SSD used as primary detector

---

## 18. Evaluation System

### 18.1 Ground Truth Labeling

The labeling workflow enables accuracy measurement:

#### Labeling Process

1. Enable "Labeling Mode" toggle in dashboard
2. Click on detected face bounding box
3. Labeling form appears with:
   - Gender selection (Male/Female)
   - Age group selection (Kid/Young/Adult)
   - False Positive checkbox
4. Click "Save Label"
5. Label is stored and applied to live tracking

#### Live Correction

When a label is saved:
```typescript
if (entry.isFalsePositive) {
  // Remove from tracking
  trackedFaces.delete(trackingId);
} else {
  // Override demographics
  tracked.genderVotes = { 
    male: entry.actualGender === 'male' ? 100 : 0, 
    female: entry.actualGender === 'female' ? 100 : 0 
  };
  tracked.stableGender = entry.actualGender;
  tracked.isUserCorrected = true;
  tracked.confidence = 1.0;  // 100% confidence
}
```

### 18.2 Metrics Calculated

The evaluation system computes comprehensive metrics:

#### Gender Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| Gender Accuracy | Correct / Total | Overall gender classification rate |
| Male Recall | TP_male / Actual_male | % of males correctly identified |
| Female Recall | TP_female / Actual_female | % of females correctly identified |
| Male Precision | TP_male / Predicted_male | % of male predictions that are correct |
| Female Precision | TP_female / Predicted_female | % of female predictions that are correct |

#### Age Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| Age Accuracy | Correct / Total | Overall age classification rate |
| Kid Accuracy | Correct_kid / Actual_kid | % of kids correctly identified |
| Young Accuracy | Correct_young / Actual_young | % of young correctly identified |
| Adult Accuracy | Correct_adult / Actual_adult | % of adults correctly identified |

#### Detection Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| False Positive Rate | FP / Total | % of detections that aren't faces |
| True Detection Rate | 1 - FPR | % of valid face detections |
| Avg Confidence (Correct) | Mean(conf where correct) | Model confidence on correct classifications |
| Avg Confidence (Incorrect) | Mean(conf where wrong) | Model confidence on incorrect classifications |

### 18.3 Confusion Matrix

#### Gender Confusion Matrix

```
                  Actual Male    Actual Female
Predicted Male      True Male      False Male
                   (correct)     (misclassified)
                   
Predicted Female   False Female   True Female
                  (misclassified)  (correct)
```

#### Age Confusion Matrix

```
                 Actual Kid   Actual Young   Actual Adult
Predicted Kid      K->K         Y->K          A->K
Predicted Young    K->Y         Y->Y          A->Y  
Predicted Adult    K->A         Y->A          A->A
```

---

## 19. Performance Optimization

### 19.1 WebGL Backend

GPU-accelerated inference:

```typescript
await tf.setBackend('webgl');
await tf.ready();
```

Benefits:
- 10-50x faster than CPU
- Parallel tensor operations
- Efficient memory usage

Fallback:
```typescript
if (webgl fails) {
  await tf.setBackend('cpu');
  // Still functional, but slower
}
```

### 19.2 Detection Timeout

Prevents infinite hangs:

```typescript
const DETECTION_TIMEOUT = 10000; // 10 seconds

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Detection timeout')), DETECTION_TIMEOUT);
});

return await Promise.race([detectionPromise, timeoutPromise]);
```

### 19.3 In-Flight Detection Prevention

Prevents overlapping detection calls:

```typescript
if (inFlightRef.current) {
  return []; // Skip if previous detection still running
}

inFlightRef.current = true;
try {
  // Run detection
} finally {
  inFlightRef.current = false;
}
```

### 19.4 Frame Rate and Latency Monitoring

```typescript
const stats = {
  lastFps: number,
  lastLatency: number,
  frameCount: number,
  lastFrameTime: number,
};

// Calculate FPS
stats.frameCount++;
const now = performance.now();
if (now - stats.lastFrameTime >= 1000) {
  stats.lastFps = stats.frameCount * 1000 / (now - stats.lastFrameTime);
  stats.frameCount = 0;
  stats.lastFrameTime = now;
}
```

### 19.5 Offscreen Canvas for Preprocessing

```typescript
function createPreprocessedCanvas(videoElement, options, scale, roi) {
  const canvas = document.createElement('canvas');
  canvas.width = srcWidth * scale;
  canvas.height = srcHeight * scale;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, ...);
  
  applyPreprocessing(ctx, canvas.width, canvas.height, options);
  
  return canvas;
}
```

---

## 20. Theme System

### 20.1 Theme Provider

Context-based theme management:

```typescript
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system');
  
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### 20.2 CSS Custom Properties

Theme colors defined via CSS variables in `index.css`:

**Light Mode**:
```css
:root {
  --background: 210 40% 98%;
  --foreground: 222 47% 11%;
  --primary: 199 89% 42%;
  --accent: 280 70% 50%;
}
```

**Dark Mode**:
```css
.dark {
  --background: 222 47% 6%;
  --foreground: 210 40% 96%;
  --primary: 199 89% 48%;
  --accent: 280 70% 55%;
}
```

### 20.3 Theme Toggle

User control via ThemeToggle component:

```typescript
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
};
```

### 20.4 System Preference Detection

Automatic theme based on OS preference:

```typescript
window.matchMedia('(prefers-color-scheme: dark)').matches
```

---

## 21. Routing Structure

| Route | Component | Description | Access |
|-------|-----------|-------------|--------|
| `/` | LandingPage | Marketing home page | Public |
| `/dashboard` | SmartAdsSystem | Main application | Public |
| `/admin/evaluation` | ModelEvaluation | Accuracy analysis | Password protected |
| `*` | NotFound | 404 error page | Public |

### Navigation Flow

```
Landing Page (/)
     |
     +---> Launch Demo ---> Dashboard (/dashboard)
     |                           |
     +---> Learn More            +---> Evaluation (/admin/evaluation)
           (scroll)                    (requires passcode)
```

---

## 22. Building and Deployment

### 22.1 Development Mode

```bash
npm install       # Install dependencies
npm run dev       # Start development server
```

Development server runs at `http://localhost:8080` with:
- Hot Module Replacement (HMR)
- Source maps for debugging
- Fast refresh for React components

### 22.2 Production Build

```bash
npm run build     # Create production bundle
npm run preview   # Preview production build locally
```

Build output in `dist/` directory:
- Minified JavaScript bundles
- Optimized CSS
- Compressed assets
- Hashed filenames for caching

### 22.3 Deployment

The application can be deployed to any static hosting:

**Options**:
- Netlify (drag-and-drop `dist/`)
- Vercel (connect Git repository)
- GitHub Pages
- AWS S3 + CloudFront
- Any web server serving static files

**Requirements**:
- Serve `index.html` for all routes (SPA fallback)
- HTTPS recommended for camera access
- Sufficient bandwidth for model files (~6MB)

---

## 23. Browser Compatibility

### 23.1 Recommended Browsers

| Browser | WebGL | getUserMedia | getDisplayMedia | Status |
|---------|-------|--------------|-----------------|--------|
| Chrome 80+ | Yes | Yes | Yes | Recommended |
| Firefox 75+ | Yes | Yes | Yes | Fully supported |
| Edge 80+ | Yes | Yes | Yes | Fully supported |
| Safari 14+ | Limited | Yes | Limited | Partial support |

### 23.2 Required APIs

- **WebGL**: GPU-accelerated rendering for TensorFlow.js
- **MediaDevices.getUserMedia()**: Webcam access
- **MediaDevices.getDisplayMedia()**: Screen capture
- **localStorage**: Data persistence
- **sessionStorage**: Session state
- **Canvas 2D**: Image processing

### 23.3 Fallbacks

- **WebGL unavailable**: Falls back to CPU (slower, but functional)
- **Camera unavailable**: Video file and screen capture still work
- **localStorage unavailable**: App works but settings not persisted

---

## 24. Known Limitations

### 24.1 Technical Limitations

1. **YOLO Model**: YOLOv8-face integration is planned but not fully implemented
2. **WebGPU**: Not supported (WebGL only) due to TensorFlow.js kernel compatibility
3. **Mobile Devices**: UI not optimized for mobile screens
4. **Safari**: Limited WebGL support may cause performance issues
5. **Firefox**: Screen capture may require explicit permission each time

### 24.2 Detection Limitations

1. **Face Angles**: Extreme profile views may not be detected
2. **Occlusion**: Faces covered >50% often missed
3. **Small Faces**: Below ~20px width detection is unreliable
4. **Low Light**: Very dark environments challenge all models
5. **Motion Blur**: Fast movement causes missed detections

### 24.3 Classification Limitations

1. **Age Accuracy**: Less accurate than gender (especially for adults)
2. **Male Bias**: Inherent in AgeGenderNet model (mitigated by female boost)
3. **Ethnicity Variation**: Model performance varies across demographics
4. **Accessories**: Glasses, hats, masks can affect accuracy
5. **Makeup**: Heavy makeup can influence gender classification

---

## 25. Glossary of Terms

| Term | Definition |
|------|------------|
| **IoU** | Intersection over Union - measure of overlap between two bounding boxes (0-1) |
| **FPS** | Frames Per Second - detection rate measurement |
| **ROI** | Region of Interest - specific area of frame for focused detection |
| **SSD** | Single Shot Detector - neural network architecture for object detection |
| **YOLO** | You Only Look Once - real-time object detection architecture |
| **Recall** | True Positive Rate - proportion of actual positives correctly identified |
| **Precision** | Positive Predictive Value - proportion of positive predictions that are correct |
| **Confidence** | Model's certainty in its classification (0-1) |
| **Face Score** | Detection model's certainty that region contains a face (0-1) |
| **Temporal Tracking** | Following identified objects across video frames |
| **Vote Aggregation** | Combining multiple observations to determine stable classification |
| **False Positive** | Incorrect detection (non-face detected as face) |
| **Ground Truth** | Actual correct labels (human-verified) |
| **Bounding Box** | Rectangle defining detected face location {x, y, width, height} |
| **Preprocessing** | Image enhancement before detection (gamma, contrast, etc.) |
| **Upscaling** | Increasing image resolution before processing |
| **Hold Frames** | Number of frames to maintain tracking after face not detected |
| **Capture Window** | Portion of ad during which detection occurs |
| **Demographics** | Aggregate counts of viewer characteristics (gender, age) |
| **Queue Scoring** | Algorithm to rank ads by relevance to detected audience |

---

## 26. Appendix: Type Definitions

### 26.1 Ad-Related Types

```typescript
interface AdMetadata {
  id: string;
  filename: string;
  title: string;
  gender: 'male' | 'female' | 'all';
  ageGroup: 'kid' | 'young' | 'adult' | 'all';
  duration: number;
  captureStart: number;
  captureEnd: number;
  thumbnail?: string;
  videoUrl: string;
}

interface DemographicCounts {
  male: number;
  female: number;
  kid: number;
  young: number;
  adult: number;
}

interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DetectionResult {
  gender: 'male' | 'female';
  ageGroup: 'kid' | 'young' | 'adult';
  confidence: number;
  faceScore: number;
  boundingBox?: FaceBoundingBox;
  trackingId?: string;
  lastSeen?: number;
  isUserCorrected?: boolean;
}

interface AdScore {
  ad: AdMetadata;
  score: number;
  reasons: string[];
}

interface LogEntry {
  timestamp: Date;
  type: 'info' | 'detection' | 'queue' | 'webcam' | 'ad';
  message: string;
}
```

### 26.2 Detection Types

```typescript
interface TrackedFace {
  id: string;
  boundingBox: FaceBoundingBox;
  velocity: { vx: number; vy: number };
  confidence: number;
  faceScore: number;
  gender: 'male' | 'female';
  ageGroup: 'kid' | 'young' | 'adult';
  consecutiveHits: number;
  missedFrames: number;
  firstSeenAt: number;
  lastSeenAt: number;
  detectorUsed: 'tiny' | 'ssd';
  genderVotes: { male: number; female: number };
  ageVotes: { kid: number; young: number; adult: number };
  stableGender: 'male' | 'female';
  stableAgeGroup: 'kid' | 'young' | 'adult';
  isUserCorrected?: boolean;
}

interface CCTVDetectionConfig {
  detector: 'tiny' | 'ssd' | 'dual';
  sensitivity: number;
  preprocessing: PreprocessingOptions;
  upscale: number;
  roi: ROIConfig;
  minFaceScore: number;
  hardMinFaceScore?: number;
  minFaceSizePx: number;
  minFaceSizePercent: number;
  aspectRatioMin: number;
  aspectRatioMax: number;
  minConsecutiveFrames: number;
  holdFrames: number;
  maxVelocityPx: number;
  debugMode: boolean;
  detectionMode?: 'fast' | 'accurate' | 'max';
  videoQuality?: 'hd' | 'lowQuality' | 'nightIR' | 'crowd';
  femaleBoostFactor?: number;
  enableHairHeuristics?: boolean;
  requireFaceTexture?: boolean;
  enableEnhancedRescue?: boolean;
}

interface DetectionDebugInfo {
  fps: number;
  latencyMs: number;
  backend: string;
  detectorUsed: 'tiny' | 'ssd' | 'dual';
  passUsed: 1 | 2;
  rawDetections: number;
  filteredDetections: number;
  trackedFaces: number;
  preprocessing: boolean;
  upscaled: boolean;
  frameSize: { width: number; height: number };
  roiActive: boolean;
}
```

### 26.3 Evaluation Types

```typescript
interface GroundTruthEntry {
  id: string;
  timestamp: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  detectedGender: 'male' | 'female';
  detectedAgeGroup: 'kid' | 'young' | 'adult';
  detectedConfidence: number;
  detectedFaceScore: number;
  actualGender: 'male' | 'female';
  actualAgeGroup: 'kid' | 'young' | 'adult';
  isFalsePositive: boolean;
}

interface EvaluationSession {
  id: string;
  name: string;
  createdAt: number;
  entries: GroundTruthEntry[];
}

interface EvaluationMetrics {
  totalSamples: number;
  genderAccuracy: number;
  maleRecall: number;
  femaleRecall: number;
  malePrecision: number;
  femalePrecision: number;
  ageAccuracy: number;
  kidAccuracy: number;
  youngAccuracy: number;
  adultAccuracy: number;
  falsePositiveRate: number;
  trueDetectionRate: number;
  avgConfidenceCorrect: number;
  avgConfidenceIncorrect: number;
}

interface ConfusionMatrix {
  gender: {
    maleAsMale: number;
    maleAsFemale: number;
    femaleAsMale: number;
    femaleAsFemale: number;
  };
  age: {
    kidAsKid: number;
    kidAsYoung: number;
    kidAsAdult: number;
    youngAsKid: number;
    youngAsYoung: number;
    youngAsAdult: number;
    adultAsKid: number;
    adultAsYoung: number;
    adultAsAdult: number;
  };
}
```

### 26.4 Preprocessing Types

```typescript
interface PreprocessingOptions {
  gamma: number;      // 0.5-2.0
  contrast: number;   // 0.5-2.0
  sharpen: number;    // 0-1.0
  denoise: boolean;
}

interface ROIConfig {
  enabled: boolean;
  x: number;      // 0-1 percentage
  y: number;      // 0-1 percentage
  width: number;  // 0-1 percentage
  height: number; // 0-1 percentage
}
```

---

## 27. Appendix: Algorithm Details

### 27.1 IoU Calculation

```typescript
function calculateIoU(box1: FaceBoundingBox, box2: FaceBoundingBox): number {
  // Calculate intersection coordinates
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
  
  // Calculate intersection area
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  
  // Calculate union area
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;
  
  // Return IoU
  return union > 0 ? intersection / union : 0;
}
```

### 27.2 Detection Merging

```typescript
function mergeDetections(detections, iouThreshold = 0.55, containmentThreshold = 0.85) {
  // Sort by score descending
  const sorted = [...detections].sort((a, b) => getScore(b) - getScore(a));
  const merged = [];
  
  for (const candidate of sorted) {
    let isDuplicate = false;
    
    for (const kept of merged) {
      const iou = calculateIoU(getBox(candidate), getBox(kept));
      const containment = calculateContainment(candidate, kept);
      
      if (iou >= iouThreshold || containment >= containmentThreshold) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      merged.push(candidate);
    }
  }
  
  return merged;
}
```

### 27.3 Queue Scoring

```typescript
function reorderQueue(demographics: DemographicCounts) {
  // Score all available ads
  const scoredAds = allAds.map(ad => scoreAd(ad, demographics));
  
  // Sort by score descending
  scoredAds.sort((a, b) => b.score - a.score);
  
  // Take top 2 for queue
  const newQueue = scoredAds.slice(0, 2).map(s => s.ad);
  
  setQueue(newQueue);
}
```

### 27.4 Temporal Vote Stabilization

```typescript
function getStableGender(
  votes: { male: number; female: number },
  previous: 'male' | 'female',
  opts: { minTotal?: number; minMargin?: number } = {}
): 'male' | 'female' {
  const total = votes.male + votes.female;
  const minTotal = opts.minTotal ?? 0.9;
  const minMargin = opts.minMargin ?? 0.25;
  
  // Not enough evidence
  if (total < minTotal) return previous;
  
  // Margin too small
  const diff = Math.abs(votes.female - votes.male);
  if (diff < minMargin) return previous;
  
  // Clear winner
  return votes.female > votes.male ? 'female' : 'male';
}
```

---

## Document Information

**Version**: 1.0  
**Created**: January 2024  
**Last Updated**: January 2024  
**Document Length**: ~3,400 lines  

This documentation provides a complete technical reference for the Smart Ads System, enabling developers to understand, maintain, and extend the application without needing to examine the source code directly.
