# TUIZ Universal Theme System

## 🎨 Overview

This universal theme system provides a consistent purple-blue gradient design language across the entire TUIZ application. It centralizes colors, spacing, typography, and component styles for a cohesive user experience.

## 🚀 Features

### **Core Design Elements:**
- **Purple-Blue Gradient Background**: Consistent `linear-gradient(135deg, #6366f1 0%, #a855f7 100%)`
- **Glass Morphism**: Beautiful frosted glass effects with backdrop blur
- **Typography**: Poppins font family with consistent sizing
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Accessibility**: High contrast and reduced motion support

### **Color Palette:**
- **Primary**: `#6366f1` (Indigo) → `#a855f7` (Purple)
- **Glass Effects**: Transparent white overlays with blur
- **Semantic Colors**: Success (green), Warning (yellow), Danger (red), Info (blue)

## 📁 File Structure

```
frontend/src/styles/
├── universal-theme.css          # Main theme system
├── host/                        # Host-specific styles
│   ├── host-variables.css       # Host control variables
│   ├── host-components.css      # Host components
│   ├── host-animations.css      # Host animations
│   └── host-responsive.css      # Host responsive styles
└── shared-utilities.css         # Shared utility classes
```

## 🎯 Usage Examples

### **1. Page Containers**

```css
/* Use the universal page container */
.my-page {
  @extend .tuiz-page-container; /* Or copy the styles */
  /* Additional custom styles */
}

/* Using CSS variables directly */
.custom-container {
  background: var(--tuiz-gradient-primary);
  color: var(--tuiz-white);
  font-family: var(--tuiz-font-family);
}
```

### **2. Glass Morphism Cards**

```css
/* Apply glass card styles */
.my-card {
  background: var(--tuiz-glass-light);
  backdrop-filter: var(--tuiz-blur-medium);
  border: 1px solid var(--tuiz-glass-border-light);
  border-radius: var(--tuiz-radius-2xl);
  box-shadow: var(--tuiz-shadow-glass);
}

/* Or use the utility class */
.my-element {
  /* Apply via class */
  @extend .tuiz-glass-card;
}
```

### **3. Button Variants**

```css
/* Primary button */
.primary-btn {
  background: var(--tuiz-white);
  color: var(--tuiz-primary-600);
  padding: var(--tuiz-space-3) var(--tuiz-space-6);
  border-radius: var(--tuiz-radius-xl);
  transition: all var(--tuiz-duration-normal) var(--tuiz-ease-out);
}

/* Secondary glass button */
.secondary-btn {
  background: var(--tuiz-glass-light);
  color: var(--tuiz-white);
  border: 1px solid var(--tuiz-glass-border-light);
}

/* Gradient button */
.gradient-btn {
  background: var(--tuiz-gradient-success);
  color: var(--tuiz-white);
}
```

### **4. Input Fields**

```css
.form-input {
  background: var(--tuiz-glass-light);
  border: 2px solid var(--tuiz-glass-border-light);
  border-radius: var(--tuiz-radius-xl);
  color: var(--tuiz-white);
  padding: var(--tuiz-space-4);
  font-family: var(--tuiz-font-family);
}

.form-input:focus {
  border-color: var(--tuiz-glass-border-heavy);
  background: var(--tuiz-glass-medium);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1);
}
```

### **5. Typography**

```css
.heading {
  font-family: var(--tuiz-font-family);
  font-size: var(--tuiz-text-3xl);
  font-weight: var(--tuiz-font-bold);
  color: var(--tuiz-white);
}

/* Gradient text effect */
.gradient-text {
  background: linear-gradient(45deg, var(--tuiz-white), #f0f9ff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## 🎨 CSS Custom Properties Reference

### **Gradients**
```css
--tuiz-gradient-primary: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
--tuiz-gradient-primary-hover: linear-gradient(135deg, #5b5fd1 0%, #9333ea 100%);
--tuiz-gradient-primary-active: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
--tuiz-gradient-success: linear-gradient(45deg, #10b981, #059669);
--tuiz-gradient-danger: linear-gradient(45deg, #ef4444, #dc2626);
```

### **Glass Morphism**
```css
--tuiz-glass-light: rgba(255, 255, 255, 0.1);
--tuiz-glass-medium: rgba(255, 255, 255, 0.15);
--tuiz-glass-heavy: rgba(255, 255, 255, 0.2);
--tuiz-blur-light: blur(8px);
--tuiz-blur-medium: blur(10px);
--tuiz-blur-heavy: blur(16px);
```

### **Colors**
```css
--tuiz-primary-500: #6366f1;
--tuiz-purple-500: #a855f7;
--tuiz-white: #ffffff;
--tuiz-success: #10b981;
--tuiz-warning: #f59e0b;
--tuiz-danger: #ef4444;
```

### **Spacing**
```css
--tuiz-space-1: 0.25rem;  /* 4px */
--tuiz-space-2: 0.5rem;   /* 8px */
--tuiz-space-4: 1rem;     /* 16px */
--tuiz-space-6: 1.5rem;   /* 24px */
--tuiz-space-8: 2rem;     /* 32px */
```

### **Typography**
```css
--tuiz-font-family: 'Poppins', sans-serif;
--tuiz-text-sm: 0.875rem;
--tuiz-text-base: 1rem;
--tuiz-text-lg: 1.125rem;
--tuiz-text-xl: 1.25rem;
--tuiz-font-normal: 400;
--tuiz-font-medium: 500;
--tuiz-font-semibold: 600;
```

### **Border Radius**
```css
--tuiz-radius-md: 0.375rem;   /* 6px */
--tuiz-radius-lg: 0.5rem;     /* 8px */
--tuiz-radius-xl: 0.75rem;    /* 12px */
--tuiz-radius-2xl: 1rem;      /* 16px */
--tuiz-radius-3xl: 1.5rem;    /* 24px */
```

### **Shadows**
```css
--tuiz-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--tuiz-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--tuiz-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--tuiz-shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.1);
```

## 🔄 Animations

### **Built-in Animations**
```css
.tuiz-animate-float     /* Floating animation */
.tuiz-animate-shimmer   /* Shimmer hover effect */

/* Keyframes available */
@keyframes tuizFloat { /* Gentle up-down movement */ }
@keyframes tuizShimmer { /* Light sweep effect */ }
@keyframes tuizPulse { /* Scale and opacity pulse */ }
@keyframes tuizBounce { /* Bouncing animation */ }
```

## 📱 Responsive Design

### **Breakpoints**
```css
--tuiz-screen-sm: 640px;
--tuiz-screen-md: 768px;
--tuiz-screen-lg: 1024px;
--tuiz-screen-xl: 1280px;
```

### **Responsive Utilities**
```css
.tuiz-responsive-text    /* Responsive font sizing */
.tuiz-responsive-padding /* Responsive padding */

@media (max-width: 768px) {
  /* Mobile adjustments */
}
```

## ♿ Accessibility

### **High Contrast Support**
```css
@media (prefers-contrast: high) {
  /* Enhanced border visibility */
}
```

### **Reduced Motion Support**
```css
@media (prefers-reduced-motion: reduce) {
  /* Disabled animations */
}
```

## 📝 Migration Guide

### **Updating Existing Pages**

1. **Replace hardcoded gradients:**
   ```css
   /* Old */
   background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
   
   /* New */
   background: var(--tuiz-gradient-primary);
   ```

2. **Update glass effects:**
   ```css
   /* Old */
   background: rgba(255, 255, 255, 0.1);
   backdrop-filter: blur(10px);
   
   /* New */
   background: var(--tuiz-glass-light);
   backdrop-filter: var(--tuiz-blur-medium);
   ```

3. **Standardize spacing:**
   ```css
   /* Old */
   padding: 1rem;
   margin: 2rem;
   
   /* New */
   padding: var(--tuiz-space-4);
   margin: var(--tuiz-space-8);
   ```

## 🛠️ Best Practices

1. **Always use CSS variables** instead of hardcoded values
2. **Extend utility classes** when possible for consistency
3. **Test responsiveness** on all breakpoints
4. **Check accessibility** with high contrast and reduced motion
5. **Use semantic color names** (success, warning, danger) for actions

## 🔧 Customization

To customize the theme, update the CSS custom properties in `universal-theme.css`:

```css
:root {
  /* Override primary gradient */
  --tuiz-gradient-primary: linear-gradient(135deg, your-color-1, your-color-2);
  
  /* Adjust glass opacity */
  --tuiz-glass-light: rgba(255, 255, 255, 0.15);
  
  /* Modify spacing scale */
  --tuiz-space-4: 1.2rem;
}
```

This theme system ensures visual consistency across all TUIZ components while maintaining flexibility for future enhancements! 🎨✨
