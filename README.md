# VendorPulse

## AI Procurement Risk Intelligence with Organizational Memory

VendorPulse is an AI-powered procurement intelligence system that helps procurement teams make better-informed vendor decisions by combining current supplier data with relevant past procurement experiences.

Most procurement systems can tell you how a vendor is performing now. VendorPulse also asks:

> **What happened the last time we worked with this vendor?**

The system uses **Hindsight agent memory** to retain procurement experiences and recall relevant memories when a new purchase request is evaluated.

---

## 🚀 Live Demo

### Web Application
https://vendorpulse-frontend-opal.vercel.app

### Backend API
https://vendorpulse-backend.onrender.com

### GitHub Repository
https://github.com/Gautam-2107/VendorPulse

---

## 🎯 Problem

Procurement decisions are often based on current supplier metrics such as:

- Delivery performance
- Defect rates
- Compliance history
- Order history
- Supplier performance

However, current aggregate data does not always tell the complete story.

A vendor may look acceptable based on current numbers while previous interactions with that vendor may have included:

- Delivery delays
- Quality problems
- Rejected quantities
- Compliance failures
- Successful or unsuccessful procurement outcomes

We built VendorPulse to bring this historical context back into the decision process.

Instead of only asking:

> **"Which vendor looks good now?"**

VendorPulse also asks:

> **"What happened the last time we worked with this vendor?"**

---

## 💡 Solution

VendorPulse combines two sources of information:

1. **Current supplier data**
2. **Relevant historical experiences stored in Hindsight**

Current supplier information establishes a baseline evaluation.

Hindsight then recalls relevant procurement experiences based on the context of the new request.

The result is a more context-aware vendor evaluation that gives the procurement user additional information before making the final decision.

The system does **not** autonomously place orders. The final procurement decision remains with the human user.

---

## 🔄 How It Works

```text
Purchase Request
       ↓
Current Supplier Data
       ↓
Hindsight Memory Recall
       ↓
Contextual Vendor Evaluation
       ↓
Risk / Recommendation
       ↓
Human Decision
       ↓
Procurement Outcome
       ↓
New Memory Retained
