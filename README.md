# moodboard

## 구조
```
moodboard/
├── index.html        # 메인 페이지
├── api/
│   └── check-edit.js # 비번 검증 (Vercel serverless)
├── public/
│   └── data.json     # 카드 상태 저장 파일
└── vercel.json
```

## Vercel 배포

1. GitHub에 레포 올리기
2. Vercel에서 import (Framework: Other)
3. **Environment Variables** 추가:
   - `MB_SECRET` = 원하는비밀번호
4. Deploy

## 사용법

- 누구나 사이트 열면 무드보드 **바로** 볼 수 있음
- 하단 **`편집`** 버튼 (또는 `Shift+E`) → 비번 입력
- 맞으면 편집 모드 진입:
  - 카드 **드래그** → 이동
  - **더블클릭** → 회전
  - **모서리** → 크기 조절
  - **× 버튼** → 삭제
- **`Shift+S`** → 현재 상태 클립보드 복사
- 복사된 JSON → `public/data.json` 에 붙여넣고 커밋
- Vercel 자동 재배포 → 다음 접속 때 복원
