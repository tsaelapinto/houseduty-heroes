# Duty Cycle Logic

## Cycle Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : Cycle created but not yet started
    PENDING --> ACTIVE : Parent starts cycle\nDutyInstances generated for 7 days
    ACTIVE --> CLOSED : Parent starts next cycle\n(auto-closes current)
    CLOSED --> [*]

    state ACTIVE {
        [*] --> DailyLoop
        DailyLoop --> DutyCheck : Each day
        DutyCheck --> ASSIGNED : Kid has duty today
        ASSIGNED --> SUBMITTED : Kid submits (+optional photo)
        SUBMITTED --> APPROVED : Parent approves
        SUBMITTED --> ASSIGNED : Parent rejects (future)
        APPROVED --> [*]
    }
```

## Cycle Start / Assignment Ceremony

```mermaid
flowchart TD
    A[Parent taps Start Cycle] --> B[Close current ACTIVE cycle\nstatus → CLOSED]
    B --> C[Create new Cycle record\nstartAt = next Saturday 12:00\nendAt = +7 days]
    C --> D{Assignment mode?}

    D -->|same| E[Copy assignments from last cycle\none-to-one template → kid mapping]
    D -->|rotate| F[For each DutyTemplate:\nfind last assigned kid in that template\nadvance 1 position in allowedKids list\ncircular / round-robin]
    D -->|manual| G[Use manualAssignments\nfrom request body\narray of templateId + kidId pairs]

    E --> H
    F --> H
    G --> H

    H[For each assignment × 7 days\ncreate DutyInstance rows\nstatus = ASSIGNED]
    H --> I[Return new Cycle]
```

## Assignment Mode Detail

```mermaid
flowchart LR
    subgraph SAME mode
        S1[Template: Make Bed] -->|was: Kid A| S2[next: Kid A]
        S3[Template: dishes] -->|was: Kid B| S4[next: Kid B]
    end

    subgraph ROTATE mode
        R1[Template: Make Bed\nallowedKids = A, B, C] -->|last: Kid A\nidx=0 → next idx=1| R2[next: Kid B]
        R3[Template: Dishes\nallowedKids = A, B] -->|last: Kid B\nidx=1 → next idx=0| R4[next: Kid A]
    end

    subgraph MANUAL mode
        M1["manualAssignments: [\n  {templateId: T1, kidId: KidC},\n  {templateId: T2, kidId: KidA}\n]"] --> M2[Exact as specified]
    end
```

## Duty Instance States per Day

```mermaid
flowchart LR
    AS([ASSIGNED\n📋 Kid sees it]) -->|Kid submits| SU([SUBMITTED\n⏳ Parent notified])
    SU -->|Parent approves| AP([APPROVED\n✅ Points awarded])
    SU -.->|Parent rejects (future)| AS
    AP -->|End of cycle| CL([Cycle CLOSED\nCounted in summary])
```

## Points & Rewards Flow

```mermaid
flowchart TD
    A[DutyInstance APPROVED] --> B[Approval.pointsAwarded stored\nuses override → template.defaultPoints]
    B --> C[(Kid's cumulative points\n= SUM of all Approval.pointsAwarded)]
    C --> D{Kid opens Rewards Shop}
    D --> E[GET /rewards/kid/:id\nreturns totalPoints, spentPoints, availablePoints, unlocks]
    E --> F{Kid selects item}
    F --> G{availablePoints >= item.pointsCost?}
    G -->|Yes| H[POST /rewards/unlock\nUserUnlock record created]
    H --> I[availablePoints recalculated on next fetch]
    G -->|No| J[Button disabled\n'Not enough pts']
```

## Photo Retention Policy

```mermaid
flowchart LR
    U[Photo uploaded] --> P[PhotoAsset.deleteAt = now + PHOTO_RETENTION_DAYS\ndefault 30 days]
    P --> Q{Scheduled cleanup job\nfuture cron}
    Q -->|deleteAt passed| R[Delete file from storage\nDelete PhotoAsset record]
    Q -->|deleteAt future| S[Keep]
```
