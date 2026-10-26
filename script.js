/* =========================================================
   안심ON - 나와 닮은 돌봄 유형검사
   ---------------------------------------------------------
   구성
   1) DATA    : 질문·선택지·유형 매핑, 결과 데이터
   2) LOGIC   : 점수 계산 / 동점 판정 / Q7 동점 해소 (UI와 무관한 순수 함수)
   3) STATE   : 현재 화면과 응답 상태
   4) VIEW    : 화면별 HTML 생성
   5) FLOW    : 화면 전환, 버튼 동작, 로딩 애니메이션
   6) LAYOUT  : 1080×1920 기준 좌표계를 실제 화면에 맞추는 배율 계산
   7) DEBUG   : ?debug=1 일 때만 보이는 개발자 패널
   ※ 최신 문법(옵셔널 체이닝 등)을 피하고 ES5 수준으로 작성 — webOS 내장 브라우저 호환
   ========================================================= */
(function () {
  'use strict';

  /* =======================================================
     1) DATA
     ======================================================= */

  // 유형 키 → 화면 표시용 정보 (화면에는 유형명을 질문 단계에서 노출하지 않음)
  var TYPE_ORDER = ['resp', 'judge', 'catch', 'together'];

  // 질문 데이터 (2026-10-26 새 질문 시안 기준). '\n'은 시안의 줄바꿈 위치, 공백·따옴표도 시안 그대로입니다.
  // layout: 시안마다 다른 세로 위치를 그대로 옮긴 값 (1080×1920 기준)
  //   dy      : QUESTION 라벨·진행 숫자·진행바를 기존 위치보다 내린 값
  //   dyNum   : Q번호·제목·설명을 기존 위치보다 내린 값
  //   optBottom: 선택지 묶음의 아래 끝 y   /   btnTop: 이전·다음 버튼 윗변 y
  //   offsetX : Q번호·제목·설명을 오른쪽으로 민 값
  var QUESTIONS = [
    {
      title: '친구들과 여행을 떠나기 전날이에요.',
      desc: '친구 3명과 2박 3일 부산 여행을 가기로 했어요.\n숙소와 기차표 예약을 마쳤고, 함께 갈 장소도 정했어요.\n여행 전날 밤, 마지막으로 한 가지를 확인한다면?',
      layout: { dy: 19, dyNum: 19, optBottom: 1648, btnTop: 1726, offsetX: 0 },
      options: [
        { text: '기차표와 숙소 예약, 준비물 중 빠뜨린 것은\n없는지 확인한다.', type: 'resp' },
        { text: '예약한 숙소와 기차편이 일정과 예산에 적합한\n선택이었는지 살펴본다.', type: 'judge' },
        { text: '처음 계획한 여행 일정에서 어떤 장소나 시간이\n달라졌는지 확인한다.', type: 'catch' },
        { text: '친구들이 최종 여행 일정과 각자 준비할 내용을\n알고 있는지 확인한다.', type: 'together' }
      ]
    },
    {
      title: '신청한 프로그램의 안내를 받았어요.',
      desc: '주말에 참여할 요리 체험 프로그램을 예약했어요.\n프로그램 날짜가 다가오자 상세 안내를 보내준다고 해요.\n어떤 내용이 가장 도움이 될까요?',
      layout: { dy: 19, dyNum: 19, optBottom: 1648, btnTop: 1726, offsetX: 0 },
      options: [
        { text: '예약 당시 안내와 비교해 일정이나 내용에서\n달라진 점', type: 'catch' },
        { text: '체험이 어떤 순서로 진행되고,  그 방식으로\n운영하는 이유', type: 'judge' },
        { text: '체험 장소, 준비물, 진행 시간, 유의 사항을\n정리한 안내', type: 'resp' },
        { text: '참가자들이 공지와 질문을 함께 확인할 수 있는\n소통 공간', type: 'together' }
      ]
    },
    {
      title: '집 수리를 맡겼어요.',
      desc: '집에 있는 수도꼭지가 고장 나 수리 기사에게 수리를 맡겼어요.\n기사가 수리가 잘 진행되고 있다고 연락했을 때, 어떤 말을\n들으면 가장 안심될까요?',
      layout: { dy: 19, dyNum: 19, optBottom: 1648, btnTop: 1726, offsetX: 5 },
      options: [
        { text: '"함께 사는 가족들에게도 수리 상황과 사용 시 주\n의할 점을 알려드렸어요."', type: 'together' },
        { text: '"처음 확인한 상태에서 이 부분까지 수리했고, 지\n금은 작동 상태를 점검하고 있어요."', type: 'catch' },
        { text: '"고장 난 부분뿐 아니라 필요한 점검과 조치도 빠\n짐없이 진행하고 있어요."', type: 'resp' },
        { text: ' "고장 원인을 확인했고, 이런 이유로 지금의 수\n리 방법을 선택했어요."', type: 'judge' }
      ]
    },
    {
      title: '가족 모임을 준비하고 있어요.',
      desc: '다가오는 주말에 가족들이 모여 식사하기로 했어요.\n장소 예약과 음식 준비 등을 나누어 맡았고, 준비 상황을\n이야기하고 있어요. 가장 먼저 확인하고 싶은 것은?',
      layout: { dy: 19, dyNum: 25, optBottom: 1650, btnTop: 1726, offsetX: 6 },
      options: [
        { text: '처음 계획한 모임에서 장소나 일정 등\n달라진 부분이 있는지', type: 'catch' },
        { text: '식당 예약과 음식 준비 등 맡은 일들이\n빠짐없이 진행되고 있는지', type: 'resp' },
        { text: '가족 모두가 모임 일정과 준비 상황을 같은\n내용으로 알고 있는지', type: 'together' },
        { text: '모임 장소와 식사 메뉴를 지금처럼 선택한\n이유가 무엇인지', type: 'judge' }
      ]
    },
    {
      title: '새로운 노트북을 구매하려고 해요.',
      desc: '작업에 사용할 노트북을 사기 위해 여러 제품을 비교했어요.\n마음에 드는 제품을 하나 골랐지만, 결제하기 전 마지막으로\n한 가지를 확인한다면?',
      layout: { dy: 19, dyNum: 25, optBottom: 1650, btnTop: 1726, offsetX: 0 },
      options: [
        { text: '작업에 필요한 성능과 기능을 빠뜨리지 않고\n확인했는지', type: 'resp' },
        { text: '처음 고려했던 노트북과 비교해 성능이나\n기능에서 무엇이 달라졌는지', type: 'catch' },
        { text: '주변 사람들과 제품 정보를 공유하고 의견을\n충분히 나눴는지', type: 'together' },
        { text: '가격과 성능을 고려했을 때 이 노트북을 선택할\n만한 근거가 충분한지', type: 'judge' }
      ]
    },
    {
      title: '예약한 식당에서 연락이 왔어요.',
      desc: '주말 저녁 6시로 예약한 식당에서 사정이 생겨 예약 시간을 7시\n로 변경해야 한다고 연락했어요. 가장 먼저 확인하고 싶은 것은?',
      layout: { dy: 19, dyNum: 25, optBottom: 1616, btnTop: 1726, offsetX: 0 },
      options: [
        { text: '예약 시간을 변경해야 하는 이유가 무엇인지', type: 'judge' },
        { text: '변경된 시간에도 예약 인원과 좌석 등 필요한\n준비가 문제없이 이루어지는지', type: 'resp' },
        { text: '예약 시간 외에 메뉴나 이용 조건 등 달라진\n사항이 있는지', type: 'catch' },
        { text: '함께 식사할 사람들도 변경된 시간을 알고\n괜찮다고 생각하는지', type: 'together' }
      ]
    }
  ];

  // 추가 질문 FINAL QUESTION — Q1~Q6 최고점 동점일 때만 표시, 동점 유형의 카드만 보여줌 (점수 합산에는 포함 안 함)
  var Q7 = {
    title: ' 나에게 더 가까운 모습은?',   // 시안의 앞 공백까지 그대로
    // 카드가 2개면 시안 문구('둘 다'), 3개 이상이면 '모두'로 바꿔 표시
    desc: '다음은 내가 상황을 확인하는 서로 다른 방식이에요. 둘 다\n중요할 수 있지만, 평소 나에게 더 가까운 모습을 선택해 주세요.',
    descMany: '다음은 내가 상황을 확인하는 서로 다른 방식이에요. 모두\n중요할 수 있지만, 평소 나에게 더 가까운 모습을 선택해 주세요.',
    // 카드는 위(y=834)부터 쌓아 개수가 줄어도 설명 바로 아래에 붙도록 함
    layout: { dy: 19, dyNum: 25, optTop: 834, btnTop: 1726, offsetX: 0 },
    options: [
      { text: '필요한 일들이 빠짐없이 진행되는 것을\n확인할 때 마음이 놓인다.', type: 'resp' },
      { text: '어떤 판단을 내렸고, 그 이유와 근거를\n이해할 때 마음이 놓인다', type: 'judge' },
      { text: '처음부터 지금까지 어떤 변화가 있었는지\n알 때 마음이 놓인다.', type: 'catch' },
      { text: '관련된 사람들이 같은 상황을 이해하고\n공유하고 있을 때 마음이 놓인다.', type: 'together' }
    ]
  };

  var LETTERS = ['A', 'B', 'C', 'D'];

  // 결과 데이터 (문장·줄바꿈은 결과 시안 그대로)
  // layout 값은 유형별 시안의 실제 좌표 차이를 그대로 옮긴 것입니다.
  var RESULTS = {
    resp: {
      no: '01', name: '책임온', img: 'assets/img/char-1.png',
      sections: [
        '가족에게 도움이 필요할 때 먼저 해야 할 일을 찾아 직접\n챙기는 편입니다. 식사, 약, 일정처럼 구체적인 일을 살피고,\n필요한 일이 빠짐없이 이루어질 때 마음이 놓입니다.',
        '가족을 병원에 맡긴 뒤 직접 돌보지 못하는 시간이 길어지거나,\n면회에서 작은 변화를 발견하면 “혹시 필요한 돌봄이 빠진 건\n아닐까?”라는 걱정이 들 수 있습니다.',
        '모든 순간을 직접 확인하려 하기보다, 평소 중요하게 생각했던\n식사·복약 등의 돌봄이 꾸준히 이어지고 있는지 살펴보세요.\n돌봄의 흐름을 확인하면 직접 챙기지 못하는 시간에도 안심할\n수 있습니다.'
      ],
      need: '돌봄의 연속성',
      needSub: '보이지 않는 시간에도 평소의 돌봄이\n계속되고 있다는 것.',
      layout: { header: 740, typeTop: 285, nameGlyph: 385, char: [577, 246, 407, 426], firstGap: 96, lastExtra: 0 }
    },
    judge: {
      no: '02', name: '채점온', img: 'assets/img/char-2.png',
      sections: [
        '중요한 결정을 내릴 때 정보를 비교하고 판단의 이유를 이해하려\n는 편입니다. 단순히 어떤 결정을 내렸는지보다 왜 그런 결정을\n내렸는지가 중요합니다.',
        '예상하지 못한 변화가 생기거나 중요한 결정을 내려야 할 때,\n충분한 설명 없이 결과만 전달받으면 “이 판단을 믿어도 되는\n걸까?”라는 의문이 생길 수 있습니다.',
        '모든 정보를 직접 검토하려 하기보다, 무엇을 확인했고 어떤\n기준으로 판단했으며 이후 어떤 대응이 이루어졌는지 핵심적인\n과정을 확인해보세요. 판단의 이유를 이해하면 불확실한 상황에\n서도 조금 더 안심할 수 있습니다.'
      ],
      need: '판단의 근거',
      needSub: '결과뿐 아니라 그 결과에 이르는 과정이\n이해된다는 것.',
      layout: { header: 745, typeTop: 284, nameGlyph: 382, char: [594, 260, 360, 413], firstGap: 96, lastExtra: 0 }
    },
    catch: {
      no: '03', name: '포착온', img: 'assets/img/char-3.png',
      sections: [
        '현재 보이는 모습만으로 판단하기보다 평소와 무엇이\n달라졌는지 살펴보는 편입니다. 이전 모습과 비교하고 변화의\n흐름을 이해할 때 상황을 더 잘 받아들일 수 있습니다.',
        '오랜만에 만난 가족의 모습이 이전과 달라졌지만 그 사이의\n상황을 알지 못하면, “내가 모르는 사이에 많이 달라진 건\n아닐까?”라는 걱정이 커질 수 있습니다.',
        '오늘 본 한 장면만으로 판단하기보다, 언제 변화가 시작되었고\n그동안 어떤 관찰과 대응이 이어졌는지 함께 살펴보세요.\n변화의 앞뒤 맥락을 이해하면 걱정을 줄이는 데 도움이 됩니다.'
      ],
      need: '변화의 맥락',
      needSub: '오늘의 한 장면이 아니라 이어져 온 변화의\n흐름을 이해하는 것.',
      layout: { header: 746, typeTop: 286, nameGlyph: 384, char: [566, 305, 418, 360], firstGap: 53, lastExtra: 58 }
    },
    together: {
      no: '04', name: '같이온', img: 'assets/img/char-4.png',
      sections: [
        '가족마다 알고 있는 정보가 다를 때 내용을 모으고 서로의\n이해를 맞추려는 편입니다. 누가 무엇을 알고 있는지 확인하고,\n필요한 내용을 정리해 전달하는 역할을 자연스럽게 맡습니다.',
        '가족마다 병원에서 들은 설명이 다르거나 같은 질문을 반복할\n때, “결국 내가 다 정리해서 알려줘야 하나?”라는 부담을\n느낄  수 있습니다.',
        '모든 정보를 혼자 전달하기보다 가족이 함께 확인할 수 있는\n기록을 기준으로 이야기를 나눠보세요. 각자가 같은 정보를\n확인할 수 있다면 소통에 대한 부담을 줄이고 돌봄의 책임도\n함께 나눌 수 있습니다.'
      ],
      need: '공동의 이해',
      needSub: '내가 모든 정보를 전달하지 않아도 가족과\n병원이 같은 상황을 함께 이해하고 있다는\n것.',
      layout: { header: 744, typeTop: 289, nameGlyph: 387, char: [600, 241, 357, 433], firstGap: 55, lastExtra: 72.5 }
    }
  };

  var SECTION_TITLES = ['나의 돌봄 성향', '미래에 나는 이런 순간에 불안해질 수 있어요', '이럴 때는 이렇게 해보세요'];
  var FOOTNOTE = '*일상에서 나타나는 확인 성향을 바탕으로 나와 가까운 돌봄 유형을 알아보는 체험입니다.';

  // 로딩 캐릭터: 같은 1600×374 캔버스를 같은 좌표로 4등분한 조각 (실루엣·완성본 외곽 일치)
  var LOAD_SLOTS = [
    { left: 0, width: 188.5 },
    { left: 188.5, width: 198 },
    { left: 386.5, width: 237 },
    { left: 623.5, width: 176.5 }
  ];

  // 로딩 타임라인(ms) — 요청 사양 그대로
  var TIMING = { appear: [300, 700, 1100, 1500], toResult: 2700 };

  var PRELOAD = [
    'assets/img/logo.png', 'assets/img/start-illust.png',
    'assets/img/char-1.png', 'assets/img/char-2.png', 'assets/img/char-3.png', 'assets/img/char-4.png',
    'assets/img/sil-1.png', 'assets/img/sil-2.png', 'assets/img/sil-3.png', 'assets/img/sil-4.png',
    'assets/img/load-1.png', 'assets/img/load-2.png', 'assets/img/load-3.png', 'assets/img/load-4.png'
  ];

  /* =======================================================
     2) LOGIC — 화면과 분리된 순수 함수
     ======================================================= */

  // Q1~Q6 응답(선택지 인덱스 배열)으로 유형별 점수 계산
  function calcScores(answers) {
    var s = { resp: 0, judge: 0, catch: 0, together: 0 };
    for (var i = 0; i < QUESTIONS.length; i++) {
      var a = answers[i];
      if (a === null || a === undefined) continue;
      s[QUESTIONS[i].options[a].type] += 1;
    }
    return s;
  }

  // 최고점 유형 목록 (동점이면 2개 이상)
  function topTypes(scores) {
    var max = -1, list = [];
    for (var i = 0; i < TYPE_ORDER.length; i++) {
      var t = TYPE_ORDER[i];
      if (scores[t] > max) { max = scores[t]; list = [t]; }
      else if (scores[t] === max) { list.push(t); }
    }
    return list;
  }

  function needsTiebreak(answers) { return topTypes(calcScores(answers)).length > 1; }

  // 최종 유형 확정
  //  · 단독 1위 → 그 유형
  //  · 동점 → Q7에서 고른 유형이 공동 1위에 있으면 그 유형
  //  · Q7 선택이 공동 1위가 아니면 → Q1부터 순서대로 보며 공동 1위 유형을 가장 먼저 고른 것
  function resolveType(answers, q7) {
    var top = topTypes(calcScores(answers));
    if (top.length === 1) return top[0];
    if (q7 !== null && q7 !== undefined) {
      var picked = Q7.options[q7].type;
      if (top.indexOf(picked) !== -1) return picked;
    }
    for (var i = 0; i < QUESTIONS.length; i++) {
      var a = answers[i];
      if (a === null || a === undefined) continue;
      var t = QUESTIONS[i].options[a].type;
      if (top.indexOf(t) !== -1) return t;
    }
    return top[0];
  }

  /* =======================================================
     3) STATE
     ======================================================= */
  var state;
  function resetState() {
    state = {
      screen: 'start',          // start | question | loading | result
      qIndex: 0,                // 0~5 = Q1~Q6, 6 = Q7
      answers: [null, null, null, null, null, null],
      q7: null,
      finalType: null,
      loadingStarted: false,
      busy: false               // 전환 중 입력 잠금
    };
  }
  resetState();

  /* =======================================================
     4) VIEW — 화면 HTML 생성
     ======================================================= */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // '\n' → <br>, 연속 공백은 시안 그대로 유지
  function lines(s) { return esc(s).replace(/ {2}/g, ' &nbsp;').replace(/(^|\n) /g, '$1&nbsp;').replace(/\n/g, '<br>'); }

  var ICON_X = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M3 3L19 19M19 3L3 19" stroke="#555A66" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';
  function iconArrow(dir, color) {
    var d = dir === 'left' ? 'M26 13H2.5M13 2.5L2.5 13L13 23.5' : 'M2 13H25.5M15 2.5L25.5 13L15 23.5';
    return '<svg class="ico-arrow" viewBox="0 0 28 26" aria-hidden="true"><path d="' + d + '" stroke="' + color + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  }
  var LOGO = '<img class="logo" src="assets/img/logo.png" alt="안심ON">';
  var HOME = '<button type="button" class="home-btn" data-action="home">' + ICON_X + '<span>처음으로</span></button>';

  function viewStart() {
    return '<div class="stage">' + LOGO +
      '<h1 class="start-title">나와 닮은 돌봄<br>유형을 찾아보세요!</h1>' +
      '<p class="start-desc">가족을 돌보는 방식과 안심하는 기준은 사람마다 다릅니다.<br>몇 가지 질문으로 나의 돌봄 성향을 알아보세요.</p>' +
      '<div class="start-ground"></div>' +
      '<img class="start-illust" src="assets/img/start-illust.png" alt="">' +
      '<button type="button" class="btn-start" data-action="start"><span>검사 시작하기</span>' + iconArrow('right', '#FFFFFF') + '</button>' +
      '</div>';
  }

  // Q7에 보여줄 선택지 = Q1~Q6 최고점 동점 유형의 카드만 (원래 순서 유지)
  function q7VisibleOptions() {
    var top = topTypes(calcScores(state.answers)), list = [];
    for (var i = 0; i < Q7.options.length; i++) if (top.indexOf(Q7.options[i].type) !== -1) list.push(i);
    return list;
  }

  function viewQuestion(idx) {
    var isQ7 = idx === 6;
    var q = isQ7 ? Q7 : QUESTIONS[idx];
    var L = q.layout;
    var selected = isQ7 ? state.q7 : state.answers[idx];
    var label = isQ7 ? 'FINAL QUESTION' : 'QUESTION 0' + (idx + 1);
    var count = isQ7 ? '추가 질문' : (idx + 1) + ' / 6';
    var num = isQ7 ? 'Q7.' : 'Q' + (idx + 1) + '.';
    var activeBars = isQ7 ? 6 : idx + 1;
    var nextLabel = (idx >= 5) ? '결과 보기' : '다음';
    var visible = isQ7 ? q7VisibleOptions() : [0, 1, 2, 3];
    var desc = (isQ7 && visible.length > 2) ? q.descMany : q.desc;

    // 시안별 위치 (CSS 기본값 + 이동량)
    var top = function (base, d) { return 'top:' + (base + d) + 'px;'; };
    var shiftX = L.offsetX ? 'margin-left:' + L.offsetX + 'px;' : '';
    var optPos = (L.optTop !== undefined) ? 'top:' + L.optTop + 'px;bottom:auto;' : 'bottom:' + (1920 - L.optBottom) + 'px;';

    var bars = '';
    for (var b = 0; b < 6; b++) bars += '<i' + (b < activeBars ? ' class="on"' : '') + '></i>';

    var opts = '';
    for (var k = 0; k < visible.length; k++) {
      var o = visible[k];
      // 알파벳은 화면에 보이는 순서대로 A, B, C… (Q7에서 카드가 줄어도 자연스럽게)
      opts += '<button type="button" class="option' + (selected === o ? ' is-selected' : '') + '" data-action="pick" data-index="' + o + '">' +
        '<span class="letter">' + LETTERS[k] + '</span><span class="opt-text">' + lines(q.options[o].text) + '</span></button>';
    }

    return '<div class="stage">' + LOGO + HOME +
      '<div class="q-label" style="' + top(224.4, L.dy) + '">' + label + '</div>' +
      '<div class="q-count" style="' + top(223.9, L.dy) + '">' + count + '</div>' +
      '<div class="progress" style="' + top(284, L.dy) + '">' + bars + '</div>' +
      '<div class="q-num" style="' + top(361, L.dyNum) + shiftX + '">' + num + '</div>' +
      '<div class="q-text" style="' + top(474.25, L.dyNum) + shiftX + '"><h2 class="q-title">' + lines(q.title) + '</h2><p class="q-desc">' + lines(desc) + '</p></div>' +
      '<div class="options" style="' + optPos + '">' + opts + '</div>' +
      '<button type="button" class="btn-prev" data-action="prev" style="top:' + L.btnTop + 'px">' + iconArrow('left', '#0A0A0F') + '<span>이전</span></button>' +
      '<button type="button" class="btn-next' + (selected === null ? ' is-disabled' : '') + '" data-action="next" aria-disabled="' + (selected === null) + '" style="top:' + L.btnTop + 'px"><span>' + nextLabel + '</span>' + iconArrow('right', '#FFFFFF') + '</button>' +
      '</div>';
  }

  function viewLoading() {
    var slots = '';
    for (var i = 0; i < 4; i++) {
      slots += '<div class="load-slot" style="left:' + LOAD_SLOTS[i].left + 'px;width:' + LOAD_SLOTS[i].width + 'px">' +
        '<img class="sil" src="assets/img/sil-' + (i + 1) + '.png" alt="">' +
        '<img class="chr" src="assets/img/load-' + (i + 1) + '.png" alt=""></div>';
    }
    return '<div class="stage"><div class="load-chars">' + slots + '</div>' +
      '<p class="load-title">나의 확인 방식을<br>살펴보고 있어요</p>' +
      '<p class="load-sub">잠시만 기다려 주세요</p></div>';
  }

  function viewResult(type) {
    var r = RESULTS[type], L = r.layout;
    // 이름 글자 윗선(nameGlyph)에 맞추기 위한 라인박스 보정값 22.8
    var head = '<header class="r-header" style="height:' + L.header + 'px">' + LOGO + HOME +
      '<div class="r-type" style="top:' + L.typeTop + 'px">TYPE ' + r.no + '</div>' +
      '<h1 class="r-name" style="top:' + (L.nameGlyph - 22.8) + 'px">' + r.name + '</h1>' +
      '<img class="r-char" src="' + r.img + '" alt="" style="left:' + L.char[0] + 'px;top:' + L.char[1] + 'px;width:' + L.char[2] + 'px;height:' + L.char[3] + 'px">' +
      '</header>';

    var secs = '';
    for (var i = 0; i < 3; i++) {
      var extra = (i === 2 && L.lastExtra) ? ' style="padding-bottom:' + (55.3 + L.lastExtra) + 'px"' : '';
      secs += '<section class="r-sec"' + extra + '><h3><span class="no">0' + (i + 1) + '</span>' + SECTION_TITLES[i] + '</h3>' +
        '<p>' + lines(r.sections[i]) + '</p></section>';
    }

    return '<div class="result-scroller"><div class="result-sizer"><div class="result-page">' + head +
      '<div class="r-body" style="padding-top:' + L.firstGap + 'px">' + secs + '</div>' +
      '<div class="r-navy"><div class="lbl"><span class="no">04</span>나에게 필요한 확신</div>' +
      '<div class="big">' + r.need + '</div><div class="sub">' + lines(r.needSub) + '</div></div>' +
      '<div class="r-foot">' + FOOTNOTE + '</div>' +
      '</div></div></div>';
  }

  /* =======================================================
     5) FLOW — 화면 전환과 동작
     ======================================================= */
  var app = document.getElementById('app');
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var timers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers = []; }

  // 새 화면을 위에 올리고 페이드 인 → 끝나면 이전 화면 제거 (좌표 이동 없음)
  function show(kind, html, onShown) {
    var el = document.createElement('div');
    el.className = 'screen screen--' + kind;
    el.innerHTML = html;
    app.appendChild(el);
    layout(el);
    state.busy = true;
    var dur = reduceMotion ? 0 : (kind === 'result' ? 350 : 250);
    void el.offsetWidth;                 // 리플로우 → 트랜지션 시작 보장
    el.className += ' is-in';
    later(function () {
      var olds = app.querySelectorAll('.screen');
      for (var i = 0; i < olds.length; i++) if (olds[i] !== el) app.removeChild(olds[i]);
      state.busy = false;
      if (onShown) onShown(el);
      updateDebug();
    }, dur + 20);
    updateDebug();
    return el;
  }

  function goStart() {
    clearTimers();
    resetState();
    show('start', viewStart());
  }
  function goQuestion(idx) {
    state.screen = 'question';
    state.qIndex = idx;
    show('question', viewQuestion(idx));
  }

  function goLoading() {
    if (state.loadingStarted) return;     // 로딩은 한 번만
    state.loadingStarted = true;
    state.finalType = resolveType(state.answers, state.q7);
    state.screen = 'loading';
    var el = show('loading', viewLoading());
    var slots = el.querySelectorAll('.load-slot');
    var appear = reduceMotion ? [0, 0, 0, 0] : TIMING.appear;
    for (var i = 0; i < 4; i++) {
      (function (n) { later(function () { slots[n].className += ' is-on'; }, appear[n]); })(i);
    }
    later(goResult, reduceMotion ? 1200 : TIMING.toResult);
  }

  function goResult() {
    state.screen = 'result';
    var el = show('result', viewResult(state.finalType));
    var sc = el.querySelector('.result-scroller');
    if (sc) sc.scrollTop = 0;            // 결과는 항상 맨 위에서 시작
  }

  // Q6(또는 Q7)에서 '결과 보기'
  function finish() {
    if (state.qIndex === 5 && needsTiebreak(state.answers)) { goQuestion(6); return; }
    goLoading();
  }

  function onPick(btn) {
    var idx = parseInt(btn.getAttribute('data-index'), 10);
    if (state.qIndex === 6) state.q7 = idx;
    else {
      if (state.answers[state.qIndex] !== idx) state.q7 = null;   // 답이 바뀌면 점수가 달라지므로 Q7 선택 초기화
      state.answers[state.qIndex] = idx;
    }
    // 다시 그리지 않고 클래스만 교체 → 카드 크기·위치 고정
    var screen = btn.parentNode;
    var all = screen.querySelectorAll('.option');
    for (var i = 0; i < all.length; i++) {
      if (parseInt(all[i].getAttribute('data-index'), 10) === idx) { if (all[i].className.indexOf('is-selected') === -1) all[i].className += ' is-selected'; }
      else all[i].className = all[i].className.replace(/\s*is-selected/g, '');
    }
    var next = app.querySelector('.screen:last-child .btn-next');
    if (next) { next.className = next.className.replace(/\s*is-disabled/g, ''); next.setAttribute('aria-disabled', 'false'); }
    updateDebug();
  }

  function currentSelection() { return state.qIndex === 6 ? state.q7 : state.answers[state.qIndex]; }

  // 모든 버튼은 이벤트 위임으로 처리
  app.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== app && !(t.getAttribute && t.getAttribute('data-action'))) t = t.parentNode;
    if (!t || t === app) return;
    var action = t.getAttribute('data-action');
    // 선택은 전환 중에도 허용하지 않음(겹침 방지), 처음으로는 항상 허용
    if (state.busy && action !== 'home') return;
    if (state.screen === 'loading') return;
    // 사라지는 중인 화면의 버튼은 무시
    var scr = t; while (scr && scr.className && String(scr.className).indexOf('screen') !== 0) scr = scr.parentNode;
    if (scr && scr !== app.lastChild) return;

    switch (action) {
      case 'start': goQuestion(0); break;
      case 'home': goStart(); break;
      case 'pick': onPick(t); break;
      case 'prev':
        if (state.qIndex === 0) goStart();
        else goQuestion(state.qIndex === 6 ? 5 : state.qIndex - 1);
        break;
      case 'next':
        if (currentSelection() === null) return;   // 미선택 시 이동 불가 (팝업 없음)
        if (state.qIndex < 5) goQuestion(state.qIndex + 1);
        else finish();
        break;
    }
  });

  // 우클릭·드래그·핀치 확대 방지
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });

  /* =======================================================
     6) LAYOUT — 1080×1920 기준 좌표계를 실제 뷰포트에 맞춤
     ======================================================= */
  var DESIGN_W = 1080, DESIGN_H = 1920;
  function viewport() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    var s = Math.min(w / DESIGN_W, h / DESIGN_H);   // 비율 유지(왜곡 없음)
    return { w: w, h: h, s: s };
  }

  function layout(root) {
    var v = viewport();
    var scope = root || app;
    var stages = scope.querySelectorAll('.stage');
    for (var i = 0; i < stages.length; i++) {
      var st = stages[i];
      var x = (v.w - DESIGN_W * v.s) / 2, y = (v.h - DESIGN_H * v.s) / 2;
      st.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + v.s + ')';
      st.style.webkitTransform = st.style.transform;
    }
    // 결과: 세로 화면이면 가로폭에 꽉 맞춤(세로는 스크롤), 가로 화면(미리보기)이면 질문 화면과 같은 배율로 가운데 정렬
    var rs = (v.w / v.h <= 0.75) ? v.w / DESIGN_W : v.s;
    var pages = scope.querySelectorAll('.result-page');
    for (var j = 0; j < pages.length; j++) {
      var pg = pages[j];
      pg.style.minHeight = Math.ceil(v.h / rs) + 'px';      // 내용이 짧아도 화면 끝까지 흰 배경
      var hgt = pg.offsetHeight;
      var left = (v.w - DESIGN_W * rs) / 2;
      pg.style.transform = 'translate(' + left + 'px,0) scale(' + rs + ')';
      pg.style.webkitTransform = pg.style.transform;
      pg.parentNode.style.height = Math.ceil(hgt * rs) + 'px';
    }
  }
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { layout(); updateDebug(); }, 60); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { layout(); updateDebug(); }, 200); });

  /* =======================================================
     7) DEBUG — URL에 ?debug=1 일 때만 표시
     ======================================================= */
  var DEBUG = /[?&]debug=1(&|$)/.test(location.search);
  var dbg = null;
  var TYPE_NAME = { resp: '책임온', judge: '채점온', catch: '포착온', together: '같이온' };
  function updateDebug() {
    if (!DEBUG) return;
    if (!dbg) { dbg = document.createElement('div'); dbg.id = 'debug'; document.body.appendChild(dbg); }
    var v = viewport();
    var sc = calcScores(state.answers), top = topTypes(sc);
    var ans = [];
    for (var i = 0; i < 6; i++) ans.push('Q' + (i + 1) + ':' + (state.answers[i] === null ? '-' : LETTERS[state.answers[i]]));
    dbg.textContent =
      'viewport  ' + v.w + ' × ' + v.h + '  (dpr ' + (window.devicePixelRatio || 1) + ')\n' +
      'scale     ' + v.s.toFixed(4) + '  (design 1080×1920)\n' +
      'screen    ' + state.screen + (state.screen === 'question' ? '  ' + (state.qIndex === 6 ? 'Q7' : 'Q' + (state.qIndex + 1)) : '') + '\n' +
      'answers   ' + ans.join(' ') + '  Q7:' + (state.q7 === null ? '-' : LETTERS[state.q7]) + '\n' +
      'scores    책임' + sc.resp + ' 채점' + sc.judge + ' 포착' + sc['catch'] + ' 같이' + sc.together + '\n' +
      'tie       ' + (top.length > 1 ? 'YES (' + top.map(function (t) { return TYPE_NAME[t]; }).join(', ') + ')' : 'no') + '\n' +
      'result    ' + (state.finalType ? TYPE_NAME[state.finalType] : (top.length === 1 && sc[top[0]] > 0 ? '(예상) ' + TYPE_NAME[top[0]] : '-'));
  }

  // 테스트·디버그용으로 로직만 노출 (화면 동작에는 영향 없음)
  window.ANSIM = { calcScores: calcScores, topTypes: topTypes, resolveType: resolveType, QUESTIONS: QUESTIONS, Q7: Q7, state: function () { return state; } };

  /* =======================================================
     시작: 폰트·이미지 준비 후 첫 화면 (최대 3초 대기 후 무조건 시작)
     ======================================================= */
  function preloadImages(done) {
    var left = PRELOAD.length, finished = false;
    function one() { if (--left <= 0 && !finished) { finished = true; done(); } }
    for (var i = 0; i < PRELOAD.length; i++) { var im = new Image(); im.onload = one; im.onerror = one; im.src = PRELOAD[i]; }
  }
  function fontsReady(done) {
    if (!document.fonts || !document.fonts.load) { done(); return; }
    var ws = ['400', '500', '600', '700', '800'], ps = [];
    for (var i = 0; i < ws.length; i++) ps.push(document.fonts.load(ws[i] + ' 40px Pretendard', '안심ON가A1'));
    Promise.all(ps).then(done, done);
  }
  var started = false;
  function boot() {
    if (started) return; started = true;
    app.className = '';
    try {
      // 개발 모드 바로가기: ?debug=1&result=resp|judge|catch|together  /  ?debug=1&q=1~7  /  ?debug=1&screen=loading
      var m = DEBUG && location.search.match(/[?&]result=(resp|judge|catch|together)/);
      var mq = DEBUG && location.search.match(/[?&]q=([1-7])/);
      var ml = DEBUG && /[?&]screen=loading/.test(location.search);
      if (m) { state.finalType = m[1]; goResult(); }
      else if (mq) { goQuestion(parseInt(mq[1], 10) - 1); }
      else if (ml) { state.answers = [1, 1, 1, 0, 3, 3]; goLoading(); }
      else goStart();
    } catch (err) { app.innerHTML = '<p style="padding:40px;font-size:24px">화면을 불러오지 못했습니다. 새로고침해 주세요.</p>'; }
  }
  app.className = 'is-hidden';
  var pending = 2;
  function step() { if (--pending <= 0) boot(); }
  fontsReady(step);
  preloadImages(step);
  setTimeout(boot, 3000);

  // 예기치 못한 오류 시 시작 화면으로 복구 (흰 화면 방지)
  window.addEventListener('error', function () {
    if (!app.querySelector('.screen')) { try { started = false; boot(); } catch (e) {} }
  });
})();
