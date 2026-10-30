/* 발명 특허 탐정단 — 정적 학습 데이터 (모든 예시·문헌은 교육용 가상 자료) */
window.IPDATA = (function () {
  'use strict';

  const tabs = [
    { id: 'learn', no: '01', name: '권리 이해관', lesson: '1차시' },
    { id: 'cases', no: '02', name: '사례 탐정실', lesson: '2차시' },
    { id: 'prior', no: '03', name: '선행기술 조사실', lesson: '3차시' },
    { id: 'apply', no: '04', name: '모의출원서 작성소', lesson: '3~4차시' },
    { id: 'submit', no: '05', name: '모의접수 창구', lesson: '4차시' },
    { id: 'archive', no: '06', name: '탐정 기록 보관함', lesson: '전체' }
  ];

  const levels = [
    { id: 'grade4', name: '초4' },
    { id: 'grade5to6', name: '초5~6' },
    { id: 'middle', name: '중1~3' },
    { id: 'teacher', name: '모든 설명 보기(교사)' }
  ];

  const rights = [
    {
      id: 'patent', name: '특허권', icon: '⚙',
      line: '기술적인 발명을 법에서 정한 절차로 보호하는 권리',
      what: '물건의 새로운 작동 구조, 물건을 만드는 방법처럼 "기술로 문제를 해결하는 방법"을 보호해요.',
      example: '물이 한쪽으로 모이도록 만든 새로운 내부 구조, 새로운 제조 방법',
      confusing: '아이디어를 떠올렸다고 저절로 생기지 않아요. 출원하고 심사를 거쳐 등록되어야 특허권이 생겨요.',
      remember: '특허권은 "기술"을 보호하고, 출원 → 심사 → 등록을 거쳐야 생긴다.',
      deep: '주요 요건: 산업상 이용가능성(산업에서 쓸 수 있는가), 신규성(이미 알려진 기술과 같지 않은가), 진보성(그 분야 사람이 쉽게 생각해 낼 수 없는가).'
    },
    {
      id: 'utility', name: '실용신안권', icon: '🔧',
      line: '물품의 모양·구조·조합에 관한 기술적 고안을 보호하는 권리',
      what: '물건의 형태나 구조, 부품의 조합을 바꾸어 더 쓸모 있게 만든 기술적 고안을 보호해요.',
      example: '필통 안 칸막이의 구조를 바꿔 연필이 흔들리지 않게 한 것',
      confusing: '작은 발명이라고 모두 자동으로 실용신안이 되는 것은 아니에요. 보호 대상과 절차를 따로 확인해야 해요.',
      remember: '실용신안권도 "기술"을 보호하며, 주로 물품의 형태·구조·조합에 관한 것이다.',
      deep: '방법 발명(만드는 방법 등)은 실용신안의 대상이 아니라는 점에서 특허와 차이가 있어요. 구체적 요건은 공식 안내를 확인해요.'
    },
    {
      id: 'design', name: '디자인권', icon: '◇',
      line: '물품 등의 외관(겉모양) 디자인을 보호하는 권리',
      what: '눈으로 보았을 때 느껴지는 물건의 모양·무늬·색채 등의 외관을 보호해요.',
      example: '독특한 곡선 모양의 물병, 새로운 모양의 의자',
      confusing: '물건이 "어떻게 작동하는지(기능)"는 특허·실용신안이 다루고, "어떻게 보이는지(외관)"는 디자인권이 다뤄요.',
      remember: '디자인권은 "겉모양"을 보호한다.',
      deep: '같은 물건이라도 외관은 디자인권, 기술적 구조는 특허·실용신안으로 각각 검토할 수 있어요.'
    },
    {
      id: 'trademark', name: '상표권', icon: '®',
      line: '상품·서비스의 출처를 구별하는 표지를 보호하는 권리',
      what: '"이 상품은 어느 회사 것인지" 구별하게 해 주는 이름, 로고 같은 표지를 보호해요.',
      example: '브랜드 이름, 회사 로고, 상품 이름',
      confusing: '그림 로고라고 해서 언제나 상표권이 생기는 것은 아니에요. 출처를 구별하는 표지로 쓰이고 등록 절차를 거쳐야 해요.',
      remember: '상표권은 "누구의 상품인지 알려 주는 표시"를 보호한다.',
      deep: '로고 그림 자체가 창작물이라면 저작권도 함께 관련될 수 있어요.'
    },
    {
      id: 'copyright', name: '저작권', icon: '©',
      line: '창작적으로 표현된 저작물을 보호하는 권리',
      what: '글, 그림, 음악, 사진, 영상, 컴퓨터 프로그램처럼 사람의 생각·감정을 창작적으로 표현한 것을 보호해요.',
      example: '직접 쓴 이야기, 직접 그린 만화, 작곡한 노래, 찍은 사진',
      confusing: '원칙적으로 창작과 동시에 생겨요(등록하지 않아도). 하지만 "아이디어 자체"가 아니라 "표현"을 보호해요.',
      remember: '저작권은 "표현"을 보호하고, 원칙적으로 창작할 때 생긴다.',
      deep: '다른 사람의 저작물을 이용하려면 이용 허락이 필요한 경우가 많고, 예외와 허용 범위는 구체적 상황에 따라 달라요.'
    }
  ];

  const compares = [
    {
      title: '특허 vs 저작권',
      head: ['', '특허권', '저작권'],
      rows: [
        ['보호하는 것', '기술적인 발명(구조, 방법)', '창작적인 표현(글, 그림, 음악 등)'],
        ['언제 생기나', '출원 → 심사 → 등록 후', '원칙적으로 창작과 동시에'],
        ['예시', '새로운 우산 거치 구조', '우산 사용법을 설명한 만화']
      ]
    },
    {
      title: '출원 vs 등록',
      head: ['', '출원', '등록'],
      rows: [
        ['뜻', '권리를 받고 싶다고 서류를 내어 신청하는 것', '심사를 거쳐 권리가 인정되어 설정되는 것'],
        ['특허권이 있나', '아직 없음', '등록되면 생김'],
        ['"특허출원 중"', '신청만 한 상태 — 등록 여부는 따로 확인', '"특허 등록"과 다른 말']
      ]
    },
    {
      title: '기능 vs 외관 vs 표지',
      head: ['무엇을 보나', '관련 권리', '우산 물받이 예'],
      rows: [
        ['어떻게 작동하나(기술)', '특허권·실용신안권', '물이 한곳에 모이는 내부 구조'],
        ['어떻게 보이나(외관)', '디자인권', '물방울 모양의 예쁜 겉모양'],
        ['누구 것인가(표지)', '상표권', '제품 이름과 로고']
      ]
    }
  ];

  const quiz = [
    { id: 'q1', text: '특허권은 좋은 아이디어를 떠올리기만 하면 자동으로 생긴다.', answer: false, why: '특허권은 출원하고 심사를 거쳐 등록되어야 생겨요.' },
    { id: 'q2', text: '저작권은 원칙적으로 저작물을 창작한 때부터 생긴다.', answer: true, why: '저작권은 원칙적으로 창작과 동시에 발생해요.' },
    { id: 'q3', text: '브랜드 이름과 로고는 상표권과 관련이 있다.', answer: true, why: '상표권은 상품의 출처를 구별하는 표지를 보호해요.' },
    { id: 'q4', text: '물건의 독특한 겉모양은 디자인권과 관련이 있다.', answer: true, why: '디자인권은 물품의 외관을 보호해요.' },
    { id: 'q5', text: '특허출원을 하면 그 순간 바로 특허권이 생긴다.', answer: false, why: '출원은 신청일 뿐이에요. 심사 후 등록되어야 특허권이 생겨요.' },
    { id: 'q6', text: '하나의 물건에 여러 종류의 지식재산권이 함께 관련될 수 있다.', answer: true, why: '구조는 특허, 겉모양은 디자인, 이름은 상표처럼 여러 권리가 함께 관련될 수 있어요.' },
    { id: 'q7', text: '짧게 인터넷 검색을 해서 비슷한 것을 못 찾았다면 반드시 새로운 발명이다.', answer: false, why: '짧은 검색만으로 신규성을 확정할 수 없어요. 더 많은 조사와 심사가 필요해요.' },
    { id: 'q8', text: '실용신안권은 물품의 모양·구조·조합에 관한 기술적 고안을 보호한다.', answer: true, why: '실용신안은 물품의 형태·구조·조합에 관한 고안을 다뤄요.' },
    { id: 'q9', text: '저작권은 아이디어 자체보다 창작적으로 표현된 것을 보호한다.', answer: true, why: '저작권은 아이디어가 아니라 표현을 보호해요.' },
    { id: 'q10', text: '디자인권은 물건이 어떻게 작동하는지(기술적 기능)를 보호한다.', answer: false, why: '작동 원리는 특허·실용신안, 겉모양은 디자인권이 다뤄요.' },
    { id: 'q11', text: '특허를 받으려면 발명의 구성과 작동 원리를 다른 사람이 이해할 수 있게 설명해야 한다.', answer: true, why: '명세서에 발명을 누구나 이해할 수 있도록 설명해야 해요.' },
    { id: 'q12', text: '이 웹앱에서 모의접수를 하면 실제 특허청에 출원된다.', answer: false, why: '이 웹앱은 교육용 모의출원이에요. 어디에도 제출되지 않아요.' }
  ];

  const caseOptions = [
    { id: 'patent', name: '특허권' },
    { id: 'utility', name: '실용신안권' },
    { id: 'design', name: '디자인권' },
    { id: 'trademark', name: '상표권' },
    { id: 'copyright', name: '저작권' },
    { id: 'check', name: '추가 확인 필요' }
  ];

  const cases = [
    { id: 'c1', icon: '☂', text: '새로 개발한 우산 물받이의 물이 흐르는 내부 구조', main: ['patent', 'utility'], also: [], hint: '"어떻게 작동하나"에 관한 것인지, "어떻게 보이나"에 관한 것인지 생각해 보세요.', why: '물이 흐르는 구조는 기술적인 내용이므로 특허권 또는 실용신안권 등 기술 보호를 검토해요. 구체적인 대상에 따라 달라요.' },
    { id: 'c2', icon: '◇', text: '우산 물받이의 독특한 겉모양(외관)', main: ['design'], also: [], hint: '눈으로 보이는 모양을 보호하는 권리는?', why: '물품의 외관은 디자인권을 검토해요.' },
    { id: 'c3', icon: '®', text: '물받이 제품에 사용하는 브랜드 이름과 로고', main: ['trademark'], also: ['copyright'], hint: '누구의 상품인지 알려 주는 표시예요.', why: '상품의 출처를 구별하는 이름·로고는 상표권을 검토해요. 로고 그림이 창작물이면 저작권도 관련될 수 있어요.' },
    { id: 'c4', icon: '✎', text: '우산 물받이 사용법을 설명하려고 직접 그린 캐릭터 만화', main: ['copyright'], also: ['trademark'], hint: '직접 그린 그림과 이야기는 어떤 권리와 관련될까요?', why: '직접 창작한 만화는 저작권과 관련돼요. 캐릭터를 상품 표지로 쓴다면 상표도 검토할 수 있어요.' },
    { id: 'c5', icon: '📷', text: '다른 사람이 촬영한 사진을 허락 없이 복제해 포스터에 사용', main: ['copyright'], also: ['check'], hint: '사진은 누가 만든 창작물일까요?', why: '사진은 저작물이 될 수 있으므로 저작권과 이용 허락 문제를 검토해요. 예외와 허용 범위는 구체적인 상황에 따라 달라요.' },
    { id: 'c6', icon: '📢', text: '"특허출원 중!"이라고 홍보하는 제품', main: ['check'], also: ['patent'], hint: '출원과 등록은 같은 말일까요?', why: '"출원 중"은 신청만 한 상태예요. 등록되어 특허권을 얻은 것인지는 별도로 확인해야 해요.' },
    { id: 'c7', icon: '♪', text: '학생이 새로 작곡한 학교 축제 노래', main: ['copyright'], also: [], hint: '음악은 어떤 창작물일까요?', why: '작곡한 음악은 저작물로서 저작권과 관련돼요.' },
    { id: 'c8', icon: '🧪', text: '물에 젖어도 잘 떨어지지 않는 접착 테이프를 만드는 새로운 제조 방법', main: ['patent'], also: [], hint: '"만드는 방법"도 기술이에요.', why: '새로운 제조 방법은 기술적 발명이므로 특허권을 검토해요. (방법은 실용신안의 대상이 아니에요.)' },
    { id: 'c9', icon: '🍪', text: '과자 봉지에 크게 적힌 과자 회사의 이름', main: ['trademark'], also: [], hint: '어느 회사 상품인지 알려 줘요.', why: '상품 출처를 알려 주는 이름은 상표권을 검토해요.' },
    { id: 'c10', icon: '🪑', text: '물결처럼 휘어진 독특한 모양의 의자', main: ['design'], also: [], hint: '모양이 특별한 경우예요.', why: '물품의 독특한 외관은 디자인권을 검토해요.' },
    { id: 'c11', icon: '📱', text: '새 학습 앱: 앱 이름, 직접 그린 앱 화면 그림, 문제를 자동으로 고르는 새로운 기술적 처리 방법', main: ['trademark', 'copyright', 'patent'], also: ['design', 'check'], hint: '한 제품 안에 여러 요소가 있어요. 요소마다 따로 생각해 보세요.', why: '앱 이름은 상표, 직접 그린 그림·프로그램 표현은 저작권, 새로운 기술적 처리 방법은 특허를 검토할 수 있어요. 여러 권리가 함께 관련될 수 있어요.' },
    { id: 'c12', icon: '✏', text: '필통 칸막이의 구조를 바꿔 길이가 다른 연필이 흔들리지 않게 한 고안', main: ['utility', 'patent'], also: [], hint: '물품의 구조를 바꾼 기술적 고안이에요.', why: '물품의 구조에 관한 기술적 고안이므로 실용신안권 또는 특허권을 검토해요.' },
    { id: 'c13', icon: '🖼', text: '친구가 직접 그린 학교 축제 포스터 그림', main: ['copyright'], also: [], hint: '그림은 누가 창작했나요?', why: '직접 그린 그림은 저작물로서 저작권과 관련돼요.' }
  ];

  const patentQuestions = [
    { id: 'pq1', q: '이미 알려진 기술과 같을까?', link: '신규성과 연결돼요' },
    { id: 'pq2', q: '기존 기술과 어떤 기술적 차이가 있을까?', link: '진보성 탐구의 출발이에요' },
    { id: 'pq3', q: '구체적인 구조나 작동 방법으로 설명할 수 있을까?', link: '명세서 작성과 연결돼요' },
    { id: 'pq4', q: '어떤 문제를 어떻게 해결할까?', link: '발명의 목적과 효과로 이어져요' }
  ];

  const exampleIdeas = [
    {
      id: 'ex-umbrella', title: '가방에 고정하는 우산 물받이 거치대',
      purpose: '접은 우산의 물이 가방 안으로 흐르는 문제를 줄이기',
      features: '가방에 달았다 뗄 수 있는(탈착식) 부품으로 우산을 고정하고 물을 모은다.',
      kw: { target: '우산', problem: '물이 떨어짐', structure: '탈착, 물받이' }
    },
    {
      id: 'ex-pencil', title: '필통 안의 길이 조절 연필 고정판',
      purpose: '서로 다른 길이의 필기구가 필통 안에서 흔들리지 않게 하기',
      features: '지지하는 위치를 바꿀 수 있는 고정판 구조',
      kw: { target: '필통', problem: '연필 흔들림', structure: '고정판, 길이 조절' }
    },
    {
      id: 'ex-cable', title: '책상 모서리 탈착식 전선 정리대',
      purpose: '책상 아래로 떨어지는 케이블을 정리하기',
      features: '여러 개의 홈으로 케이블을 구분해 임시로 고정하는 탈착식 구조',
      kw: { target: '책상 전선', problem: '케이블 떨어짐', structure: '탈착, 홈, 클립' }
    }
  ];

  /* 가상 학습 문헌: 실제 특허 문헌이 아님. 번호는 실제 번호 형식과 겹치지 않는 학습용 표시 */
  const fictionalDocs = [
    { id: 'F-A1', idea: 'ex-umbrella', title: '손잡이형 우산 물기 보관 주머니', features: '접은 우산을 비닐 주머니에 넣어 물기를 담는다. 손으로 들고 다녀야 한다.' },
    { id: 'F-A2', idea: 'ex-umbrella', title: '벽걸이형 우산 꽂이와 물받이 받침', features: '건물 입구 벽에 나사로 고정하고, 아래쪽 받침에 물을 모은다. 들고 다닐 수 없다.' },
    { id: 'F-B1', idea: 'ex-pencil', title: '자석으로 위치를 바꾸는 필통 칸막이', features: '필통 바닥의 자석에 칸막이를 붙여 칸의 넓이를 바꾼다. 연필 길이 방향은 고정하지 않는다.' },
    { id: 'F-B2', idea: 'ex-pencil', title: '고무줄 고정식 필통 뚜껑', features: '뚜껑 안쪽 고무줄에 연필을 끼워 고정한다. 길이 조절 기능은 없다.' },
    { id: 'F-C1', idea: 'ex-cable', title: '붙이는 1구 케이블 클립', features: '양면테이프로 책상 위에 붙여 케이블 한 가닥을 잡는다. 떼면 테이프 자국이 남을 수 있다.' },
    { id: 'F-C2', idea: 'ex-cable', title: '책상 밑 고정형 전선 바구니', features: '책상 아래에 나사로 바구니를 달아 전선을 넣어 둔다. 설치와 이동이 번거롭다.' }
  ];

  const demo = {
    inventionTitle: '가방 부착형 우산 물받이 거치대',
    category: '생활용품',
    problemSituation: '비 오는 날 접은 우산에서 떨어지는 물이 가방 속 물건을 적실 수 있다.',
    goal: '가방 외부에 우산을 임시로 고정하고 물을 모으도록 돕는다.',
    technicalField: '생활용품의 탈착식 고정 구조',
    components: [
      { name: '탈착 클립', role: '가방 끈이나 손잡이에 끼웠다 뺄 수 있게 연결한다.', drawingNumber: '1' },
      { name: '우산 지지 고리', role: '접은 우산의 몸통을 감싸 흔들리지 않게 잡아 준다.', drawingNumber: '2' },
      { name: '물받이 용기', role: '우산 끝에서 떨어지는 물을 아래에서 모은다.', drawingNumber: '3' }
    ],
    howItWorks: '① 클립을 가방에 부착한다 → ② 고리에 접은 우산을 고정한다 → ③ 우산에서 떨어지는 물이 아래 용기에 모인다.',
    useCase: '비 오는 날 등하교 중 버스나 교실에 들어갈 때 가방 옆에 우산을 걸어 둔다.',
    expectedEffect: '가방 안의 물건이 젖는 상황을 줄이는 데 도움이 될 것으로 기대한다.',
    practiceClaim: '가방에 탈착 가능하게 연결되는 클립, 접은 우산을 지지하는 고리 및 아래쪽 물받이 용기를 포함하는 우산 거치대.',
    abstract: '이 발명은 접은 우산의 물방울로 인한 불편을 줄이기 위해 가방에 부착하는 우산 거치대이다. 탈착 클립과 고리, 물받이 용기로 구성되며 물을 한 곳에 모으도록 한다.',
    keywords: ['우산', '물받이', '탈착', '가방']
  };

  /* 필드별 '예시 보기' 문장 (데모 예시 기반, 명시적 '예시 입력' 버튼으로만 채워짐) */
  const fieldExamples = {
    'application.displayName': '발명탐정 2모둠',
    'application.inventionTitle': demo.inventionTitle,
    'application.category': '생활용품',
    'application.collaborators': '번개, 해바라기',
    'application.problemSituation': demo.problemSituation,
    'application.existingSolution': '우산을 비닐봉지에 넣거나 손에 들고 다닌다.',
    'application.goal': demo.goal,
    'application.technicalField': demo.technicalField,
    'application.howItWorks': demo.howItWorks,
    'application.uniqueFeatures': '(예시 형식) 내가 찾은 ○○는 벽에 고정되어 있지만, 내 발명은 가방에 달았다 뗄 수 있다.',
    'application.improvementReason': '(예시 형식) 들고 다닐 수 있으므로 이동하는 중에도 물을 모을 수 있다.',
    'application.uncertainty': '실제로 물이 넘치지 않는지, 클립이 가방에서 빠지지 않는지 아직 확인하지 못했다.',
    'application.useCase': demo.useCase,
    'application.expectedEffect': demo.expectedEffect,
    'application.limits': '물받이 용기에 모인 물을 자주 비워야 한다.',
    'application.implementation': '플라스틱 클립과 고리를 3D 프린터로 출력하고, 작은 컵을 아래에 연결해 시제품을 만든다.',
    'application.drawing.caption': '가방 옆에 클립(1)을 끼우고, 고리(2)에 우산을 넣으면 물받이 용기(3)에 물이 모인다.',
    'application.practiceClaim': demo.practiceClaim,
    'application.abstract': demo.abstract
  };

  const process = [
    { t: '선행기술 조사', d: '비슷한 기술이 이미 공개되어 있는지 살펴봐요.', link: { name: '키프리스(KIPRIS)', url: 'https://www.kipris.or.kr' } },
    { t: '출원 준비', d: '실제 출원에는 특허고객등록(특허고객번호 등), 인증서 준비 같은 절차가 있어요. 미성년자의 경우 법정대리인 관련 사항도 공식 안내에서 확인해요.', link: { name: '특허로 출원 가이드', url: 'https://www.patent.go.kr/smart/jsp/ka/menu/guide/main/GuideMain0207.do' } },
    { t: '서류 작성', d: '출원서, 명세서(발명의 설명과 청구범위), 요약서, 필요한 도면을 준비해요.', link: { name: '특허로 명세서 작성방법', url: 'https://www.patent.go.kr/smart/jsp/ka/menu/guide/main/GuideMain0208.do' } },
    { t: '특허로를 통한 출원', d: '공식 전자출원 시스템을 통해 제출하고 수수료를 납부해요. (이 웹앱은 이 단계를 하지 않아요.)', link: { name: '특허로', url: 'https://www.patent.go.kr' } },
    { t: '심사청구 및 심사', d: '심사관이 특허 요건을 검토해 등록 여부를 판단해요.', link: { name: '지식재산처 특허의 이해', url: 'https://www.kipo.go.kr/ko/kpoContentView.do?menuCd=SCD0200111' } },
    { t: '등록결정 뒤 설정등록', d: '등록결정을 받은 뒤 등록료 납부 등 절차를 거쳐 특허권이 생겨요.', link: null }
  ];

  const links = [
    { name: '키프리스(KIPRIS, 선행기술 조사)', url: 'https://www.kipris.or.kr' },
    { name: '특허로(전자출원 안내)', url: 'https://www.patent.go.kr' },
    { name: '특허로 특허출원 가이드', url: 'https://www.patent.go.kr/smart/jsp/ka/menu/guide/main/GuideMain0207.do' },
    { name: '특허로 명세서 작성방법', url: 'https://www.patent.go.kr/smart/jsp/ka/menu/guide/main/GuideMain0208.do' },
    { name: '지식재산처 특허의 이해', url: 'https://www.kipo.go.kr/ko/kpoContentView.do?menuCd=SCD0200111' },
    { name: '한국저작권위원회', url: 'https://www.copyright.or.kr' }
  ];

  const categories = ['생활용품', '학습도구', '안전', '환경', '건강', '정보통신', '교통', '기타'];

  return { tabs, levels, rights, compares, quiz, caseOptions, cases, patentQuestions, exampleIdeas, fictionalDocs, demo, fieldExamples, process, links, categories };
})();
