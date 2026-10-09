# Dataset, grounding, and evaluation strategy

FIN does not fine-tune a model on personal transactions or an arbitrary scraped dataset. The safer deployment design is deterministic financial calculation plus retrieval-grounded explanation: user-specific numbers stay under FIN's rule-based/statistical model, while the language model receives only the calculated summary and relevant curated guidance.

## Curated official sources

| Source | Role in FIN | Guardrail |
| --- | --- | --- |
| [RBI — I Can Do: Financial Planning](https://www.rbi.org.in/FinancialEducation/content/I%20Can%20Do_RBI.pdf) | Budgeting, planned-versus-actual spending, goals, and preparing for unexpected costs | Educational context only; never overrides user data |
| [RBI — Financial Awareness Messages](https://www.rbi.org.in/commonman/images/FAME%20Booklet%20second%20edition/FAME%20Booklet%20English/FAME30072020.pdf) | Responsible borrowing, repayment capacity, saving, and budgeting | No loan approval, guarantee, or lender-specific advice |
| [MoSPI — Household Consumption Expenditure Survey 2023-24](https://www.mospi.gov.in/sites/default/files/publication_reports/Final_Report_HCES_2023-24L.pdf) | Aggregate category and household-consumption research context | Population statistics are not treated as an individual's target |
| [Open Government Data India — Household Consumer Expenditure catalog](https://data.gov.in/catalog/household-consumer-expenditure-national-sample-survey) | Discoverable government datasets for aggregate validation and future benchmark research | Catalog data is not inserted into personal recommendations |

The repository stores short reviewed summaries and source metadata in `lib/knowledge-base.js`, not copies of large datasets. Retrieval is keyword-based and deterministic. The model may cite only IDs from the retrieved set; the server filters everything else.

## Why this is not model training

- Financial amounts and recommendations must remain reproducible and auditable.
- A general language model is useful for explanation and conversation, not for replacing cash-flow arithmetic.
- Fine-tuning on synthetic transactions could teach style but would not make an individual's financial prediction more accurate.
- Fine-tuning on user records would introduce consent, retention, deletion, leakage, and representativeness risks.

For the prototype, “train the Copilot” therefore means improving the curated knowledge base, prompts, contracts, synthetic test cases, and scored evaluations. If future fine-tuning is considered, it should use consented, de-identified, licensed data and pass privacy, subgroup, hallucination, and financial-safety reviews first.

## Evaluation cases

`evals/copilot-cases.json` contains synthetic cases that assert behavioral changes rather than exact prose:

- a new medical expense should raise attention to cash-gap risk and liquidity;
- increased recurring income should update safe-to-spend and action priority; and
- a corrected debt balance should update debt pressure and debt recommendations.

No real person's financial data is included in repository tests or evaluation fixtures.
