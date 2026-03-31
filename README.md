# hanhee.me

자유롭게 메모와 사진, 스티커를 배치하고 꾸밀 수 있는 웹 기반의 인터랙티브 무드보드입니다.

## 📁 폴더 구조

```text
hanhee.me/
├── api/                  # Vercel Serverless Functions
│   ├── check-edit.js     # 편집 모드 비밀번호 검증
│   ├── get-data.js       # 저장된 카드 데이터 불러오기
│   └── save-data.js      # 카드 데이터 저장하기
├── public/               # 정적 자원 및 프론트엔드 파일
│   ├── favicon.ico       # 파비콘 이미지
│   ├── index.html        # 메인 구조 및 마크업
│   ├── script.js         # 드래그, 줌, 조작 등 메인 로직
│   └── style.css          # 무드보드 및 카드 스타일링
├── .env.local            # 로컬 환경 변수 (Git 제외)
├── .gitignore            # Git 추적 제외 파일 설정
├── package.json          # 프로젝트 정보 및 의존성 관리
├── vercel.json           # Vercel 배포 및 라우팅 설정
└── README.md             # 프로젝트 설명서