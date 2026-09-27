\# VendorPulse — AI Procurement Vendor Risk Agent



\## Project Overview



VendorPulse is an AI-powered procurement assistant that helps procurement

managers evaluate suppliers by remembering historical vendor performance,

including delivery delays, quality problems, explanations, decisions, and

outcomes.



The core differentiator is persistent memory powered by Hindsight.



VendorPulse should become more useful as historical procurement experiences

accumulate.



\## Core Workflow



The primary workflow is:



1\. User creates a purchase request.

2\. VendorPulse identifies relevant vendors.

3\. VendorPulse recalls relevant historical vendor experiences using Hindsight.

4\. VendorPulse analyzes current procurement context together with historical memory.

5\. VendorPulse explains vendor-specific risks and supporting evidence.

6\. VendorPulse provides a procurement recommendation.

7\. Human user makes the final procurement decision.

8\. The actual outcome is recorded.

9\. The outcome is retained in Hindsight for future decisions.



The learning loop is:



New Purchase

→ Recall

→ Analyze

→ Recommendation

→ Human Decision

→ Outcome

→ Retain

→ Future Recall



\## Hindsight Is Core



Hindsight is not an optional feature.



The application must clearly demonstrate that persistent memory changes

VendorPulse's behavior.



The system should demonstrate:



\- Retaining historical vendor experiences

\- Recalling relevant experiences

\- Using temporal/contextual information

\- Connecting previous decisions with outcomes

\- Improving future recommendations



Avoid implementing Hindsight merely as a decorative memory panel.



\## Target User



Primary persona:



Procurement Manager / Supply Chain Operations Manager



\## Initial Use Case



A company needs to purchase materials from one of several suppliers.



VendorPulse evaluates suppliers using:



\- Historical delivery performance

\- Delivery delays

\- Quality defects

\- Previous issues

\- Vendor explanations

\- Previous procurement decisions

\- Previous outcomes

\- Current purchase context



\## Important Scope Boundaries



Do NOT implement:



\- Real ERP integrations

\- Real payment processing

\- Autonomous purchasing

\- Real supplier transactions

\- Fully automated procurement decisions

\- Complex financial forecasting

\- Unnecessary enterprise integrations

\- Generic chatbot functionality



The human procurement user must remain responsible for the final decision.



\## Expected Architecture



Preferred initial architecture:



Frontend

→ Backend API

→ Agent / orchestration layer

→ LLM

→ Hindsight memory

→ Procurement data layer



The exact implementation may be refined after repository analysis.



\## Backend



Preferred backend technology:



\- Python

\- FastAPI



Use clear separation between:



\- API routes

\- Agent logic

\- Hindsight integration

\- Business logic

\- Data models

\- Configuration

\- External services



\## Frontend



The frontend should eventually provide:



\- Purchase request form

\- Vendor comparison

\- Risk explanation

\- Historical evidence

\- Hindsight memory evidence

\- Recommendation

\- Vendor performance timeline

\- Outcome recording



Do not build the complete frontend until the backend contract is established.



\## Data



The project will use a hybrid data strategy:



1\. Real-world supply-chain/procurement datasets as the foundation.

2\. Carefully generated synthetic contextual information where required.

3\. Synthetic data must be clearly identified as synthetic.



Do not claim synthetic contextual fields are real-world historical facts.



Potential vendor-history fields include:



\- Vendor ID

\- Vendor name

\- Material

\- Purchase order

\- Quantity

\- Unit price

\- Order date

\- Expected delivery date

\- Actual delivery date

\- Delay

\- Defect percentage

\- Quality issue

\- Delay reason

\- Vendor explanation

\- Resolution

\- Procurement decision

\- Outcome

\- Additional cost



\## Demo Principle



The final demonstration should clearly show:



WITHOUT RELEVANT MEMORY

→ Generic vendor evaluation



WITH HINDSIGHT MEMORY

→ Context-aware vendor evaluation using previous experiences



The demonstration should make the value of persistent memory obvious.



\## Engineering Principles



1\. Keep the architecture simple.

2\. Prefer working code over unnecessary abstraction.

3\. Do not add dependencies without justification.

4\. Keep secrets in environment variables.

5\. Never commit API keys.

6\. Write testable business logic.

7\. Handle API and LLM failures gracefully.

8\. Validate all external inputs.

9\. Keep Hindsight-specific code isolated where practical.

10\. Do not fabricate data or claim synthetic data is real.

11\. Do not implement features outside the defined scope without approval.

12\. Preserve existing working functionality when making changes.



\## AI Coding Agent Rules



Before making significant changes:



1\. Inspect the existing repository.

2\. Understand the current architecture.

3\. Create a concise implementation plan.

4\. Identify files that will be changed.

5\. Implement only the requested task.

6\. Run relevant tests/checks.

7\. Report what changed and what was tested.



Do not rewrite the entire project when implementing a small feature.



Do not silently change the architecture.



If a requirement is ambiguous, identify the ambiguity before making a

large architectural decision.



\## Code Quality



Code should be:



\- Readable

\- Modular

\- Maintainable

\- Typed where practical

\- Properly error handled

\- Testable



Avoid:



\- Giant files

\- Hardcoded secrets

\- Hardcoded vendor recommendations

\- Fake Hindsight calls

\- Placeholder logic presented as completed functionality

\- Unnecessary frameworks

