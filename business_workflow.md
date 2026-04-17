# Business Workflow Documentation: MindX Ticket Automation

Tài liệu này mô tả chi tiết luồng xử lý dữ liệu nghiệp vụ. Quy trình được module hóa thành 3 giai đoạn để đảm bảo tính chính xác trong việc truy xuất và xử lý logic.

---

## STAGE 1: TICKET INGESTION & DATA RETRIEVAL
*Mục tiêu: Thực hiện Tokenization tiêu đề/mô tả và truy xuất Metadata từ Wiki Knowledge Base.*

```mermaid
graph LR
    A[([Input: Raw Ticket])] --> B[Keyword Tokenization]
    B --> C{Parallel Retrieval}
    
    subgraph "Knowledge Source (Markdown Repository)"
        C --> D1[File 1.2: SLA & Service Tiers]
        C --> D2[Section 5: Response Frameworks]
        C --> D3[Section 8.1: Resolved Incident Logs]
    end
    
    D1 & D2 & D3 --> E[([Compiled Context Package])]
```

---

## STAGE 2: LOGIC PROCESSING & INCIDENT DIAGNOSTICS
*Mục tiêu: Thực hiện Tier Assignment và Root Cause Analysis (RCA) dựa trên Context Package.*

```mermaid
graph TD
    Start[([Compiled Context Package])] --> Logic{Logic Engine}

    subgraph "SLA & Tier Assignment"
        Logic --> P1[User Impact Calculation]
        P1 --> P2{Tier Mapping}
        P2 --> P3a[Impact >25: Expedite - P1]
        P2 --> P3b[Impact 5-25: Priority - P2]
        P2 --> P3c[Impact <5: Standard - P3]
    end

    subgraph "Incident Analysis (RCA)"
        Logic --> T1[Error Pattern Matching]
        T1 --> T2{Historical Comparison}
        T2 -- "Matched" --> T3[Identify Root Cause: ID Sync/CRM Payment...]
        T2 -- "Unmatched" --> T4[Label: Undocumented System Issue]
    end

    P3a & P3b & P3c & T3 & T4 --> End[([Diagnostic Result & Classification])]
```

---

## STAGE 3: RESPONSE INJECTION & PERSONA GUARDRAILS
*Mục tiêu: Soạn thảo dữ liệu đầu ra, thực thi quy tắc xưng hô và chuẩn hóa định dạng.*

```mermaid
graph TD
    Input[([Diagnostic Result])] --> Draft[Standard Template Injection]
    
    subgraph "Persona Guardrails (Tone Enforcement)"
        Draft --> R1{Tone Validation}
        R1 -- "Failed" --> F1[Filter: Remove Informal Vietnamese Terms]
        R1 -- "Passed" --> R2[Enforce: Team/Tech Team Persona]
        
        R2 & F1 --> R3{Data Completeness}
        R3 -- "Missing" --> F2[Inject: Real-time Ticket Data]
        R3 -- "Complete" --> R4[Clean: Remove HTML/Placeholders]
    end

    R4 & F2 --> Output[/Output: Final JSON Package/]
```

---

## BẢNG THAM CHIẾU QUY TẮC NGHIỆP VỤ

| Giai đoạn | Thuật ngữ Kỹ thuật | Nguồn dữ liệu (Wiki) |
| :--- | :--- | :--- |
| **Phân loại** | SLA Tier Assignment | File 1.2 - Service Tiers & SLAs |
| **Chẩn đoán** | Root Cause Analysis (RCA) | File 8.1 - Resolved Incident Logs |
| **Giao tiếp** | Persona Guardrails | System Instruction Set |
| **Dữ liệu đầu ra** | Metadata Injection | Standard Response Frameworks |
