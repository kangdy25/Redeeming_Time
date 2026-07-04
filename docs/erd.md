erDiagram
USER ||--o{ CALENDAR_MEMBER : "belongs to"
USER ||--o{ EVENT : "creates"
USER ||--o{ TASK : "creates"
USER ||--o{ EVENT_ATTENDEE : "attends"

    CALENDAR ||--o{ CALENDAR_MEMBER : "has"
    CALENDAR ||--o{ CATEGORY : "defines"
    CALENDAR ||--o{ EVENT : "contains"
    CALENDAR ||--o{ TASK : "manages"

    CATEGORY ||--o{ EVENT : "classified by (Optional)"
    EVENT ||--o{ EVENT_ATTENDEE : "invites"

    USER {
        bigint id PK "자동 생성"
        string email UK "로그인 ID (Custom User)"
        string password "해시 암호"
        string nickname "앱 노출 이름"
        string profile_image_url "S3 주소 (선택)"
        string social_provider "LOCAL / GOOGLE / KAKAO"
        string social_id "소셜 고유 ID (선택)"
        boolean is_active "활성화 여부"
        datetime created_at
        datetime updated_at
    }

    CALENDAR {
        bigint id PK
        string title "캘린더 이름"
        text description "캘린더 한 줄 설명"
        string theme_color "캘린더 기본 테마 색상"
        datetime created_at
    }

    CALENDAR_MEMBER {
        bigint id PK
        bigint calendar_id FK "Cascade 삭제"
        bigint user_id FK "Cascade 삭제"
        string role "OWNER / EDITOR / VIEWER (DRF 권한 처리용)"
        datetime joined_at
    }

    CATEGORY {
        bigint id PK
        bigint calendar_id FK "Cascade 삭제"
        string name "예: 개발 공부, 묵상, 넷플릭스"
        string color_code "카테고리 고유 색상 (Hex Code)"
        datetime created_at
    }

    EVENT {
        bigint id PK
        bigint calendar_id FK "Cascade 삭제"
        bigint category_id FK "SET_NULL 허용 (카테고리 삭제돼도 일정은 유지)"
        bigint creator_id FK "SET_NULL 또는 Cascade"
        string title "일정 제목"
        text description "상세 메모"
        datetime start_time "ISO 8601 UTC 기준 시간"
        datetime end_time "ISO 8601 UTC 기준 시간"
        boolean is_all_day "하루 종일 여부"
        string rrule "반복 조건 규칙 (선택)"
        datetime created_at
        datetime updated_at
    }

    EVENT_ATTENDEE {
        bigint id PK
        bigint event_id FK "Cascade 삭제"
        bigint user_id FK "Cascade 삭제"
        string status "ACCEPTED / DECLINED / PENDING"
    }

    TASK {
        bigint id PK
        bigint calendar_id FK "Cascade 삭제"
        bigint creator_id FK "Cascade 삭제"
        string title "할 일 내용"
        boolean is_completed "완료 여부"
        date target_date "이월(Rollover) 기준일 (Timezone 독립)"
        string priority "HIGH / MEDIUM / LOW / NONE"
        integer order "드래그 앤 드롭 정렬 순서"
        datetime created_at
        datetime updated_at
    }
