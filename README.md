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
```


🧠 Hindsight Memory
Hindsight is a core part of VendorPulse.
Instead of treating every procurement request as an isolated interaction, VendorPulse can retain previous procurement experiences and recall relevant ones when evaluating a new request.
Historical experiences can contain information such as:
- Delivery delays
- Quality issues
- Rejected quantities
- Compliance failures
- Successful deliveries


📊 Baseline + Memory
VendorPulse separates the current-data evaluation from the memory contribution.
Baseline
Current supplier information is used to establish the initial evaluation.
Current Supplier Data
        ↓
Baseline Evaluation

Hindsight Adjustment
Relevant historical experiences are recalled from Hindsight.
Hindsight Memory
        ↓
Historical Context
        ↓
Evaluation Adjustment

Combined Evaluation
The system brings the two together:
Current Supplier Data
        +
Relevant Historical Experience
        ↓
Context-Aware Evaluation

This allows the user to see how historical experience contributes to the current procurement assessment.
- Previous procurement outcomes
For example, when evaluating a new request involving a particular material category, the system can recall previous experiences involving relevant vendors and that procurement context.



✨ Main Features
Purchase Requests
Users can create and track procurement requests containing:
- Material
- Category
- Quantity
- Target delivery date
- Budget
- Priority
- Notes
- Request status
Vendor Intelligence
The Vendor Intelligence section provides supplier-level information including:
- Order history
- Average delivery performance
- Average defect rate
- Compliance failures
- Baseline evaluation
- Hindsight adjustment
- Combined evaluation
Contextual Memory
The system recalls historical experiences relevant to the current procurement context.
The goal is not simply to retrieve everything about a vendor, but to surface memories that are useful for the current decision.
Memory Evidence
The Memory section shows the experiences recalled for a procurement request.
This gives the user visibility into the historical context being used during evaluation.
Recommendations
VendorPulse combines current supplier signals and historical context to provide a recommendation for the procurement user.
The recommendation is intended as decision support rather than an autonomous purchasing action.
Human Decision
The procurement user remains responsible for accepting or rejecting the recommendation.
Outcome Retention
The outcome of a procurement interaction can be retained as a new memory, allowing future evaluations to benefit from additional experience.
The recalled memories are shown to the user as supporting evidence.
This makes the memory layer visible rather than hiding it behind a final recommendation.


💻 Running Locally
Backend
From the project root:
cd VendorPulse

$env:DISABLE_SQLALCHEMY_CEXT_RUNTIME="1"

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend

Backend:
http://127.0.0.1:8000

Swagger API documentation:
http://127.0.0.1:8000/docs

Frontend
Open another terminal:
cd VendorPulse\frontend
npm install
npm run dev

Frontend:
http://localhost:5173

🔐 Environment Variables
Create a local .env file using .env.example as the template.
The application uses environment variables for configuration including:
HINDSIGHT_API_URL
HINDSIGHT_API_KEY
HINDSIGHT_BANK_ID
HINDSIGHT_MOCK_MODE

API keys and other local secrets are intentionally excluded from the repository.
Never commit the .env file.
☁️ Deployment
Frontend
The frontend is deployed using Vercel.
Live Application:
https://vendorpulse-frontend-opal.vercel.app
Backend
The backend is deployed using Render.
Backend:
https://vendorpulse-backend.onrender.com


📊 Data
VendorPulse uses procurement data containing supplier and order-performance information to demonstrate the procurement workflow.
The project includes processed procurement datasets and supporting vendor information.
The data is used to demonstrate:
- Vendor performance
- Procurement history
- Delivery behavior
- Quality-related signals
- Supplier comparisons
- Contextual memory


🎯 Project Scope
VendorPulse focuses on procurement decision support using organizational memory.
The project demonstrates:
- Vendor evaluation
- Procurement history
- Contextual memory
- Risk-aware recommendations
- Human decision making
- Outcome retention
- Reusable organizational experience
The system is designed as a prototype and demonstration of memory-augmented procurement intelligence.


⚠️ Limitations
VendorPulse does not currently provide:
- Direct ERP integration
- Autonomous purchasing
- Real supplier communication
- Automatic purchase-order execution
- Real-world procurement authorization
- Autonomous financial transactions
The human procurement user remains responsible for the final decision.


🧩 Why Organizational Memory?
A procurement system can store historical records without necessarily making that history useful during the next decision.
VendorPulse focuses on the step between storing information and actually using it.
The idea is:
Past Experience
      ↓
Retain
      ↓
Recall When Relevant
      ↓
Use as Context
      ↓
Inform Future Decisions

The system therefore treats previous procurement outcomes as reusable organizational experience.


🔗 Hindsight Resources
VendorPulse uses Hindsight as its agent memory layer.
Hindsight GitHub
https://github.com/vectorize-io/hindsight
Hindsight Documentation
https://hindsight.vectorize.io/
What is Agent Memory?
https://vectorize.io/what-is-agent-memory


👥 Team
VendorPulse was developed by a five-member team.
- Gautam Raju — Gautam-2107
- Nitin Teja — enithinteja-lab
- Nitin Kumar — Nithinkumar-07-Code
- Chakravardhan Reddy — chakra032s-ai
- Charan Teja — charantejabikkasani-lgtm


🔗 Project Links
GitHub Repository
https://github.com/Gautam-2107/VendorPulse
Live Application
https://vendorpulse-frontend-opal.vercel.app
Backend API
https://vendorpulse-backend.onrender.com
🙏 Acknowledgement
VendorPulse uses Hindsight for persistent agent memory and contextual recall.
The project was built to explore how memory can make an AI procurement assistant more useful across repeated interactions rather than treating every request as a completely new problem.
