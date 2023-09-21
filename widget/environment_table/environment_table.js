self.onInit = function () {
  // 변수 정의
  defineVariables();

  // 위젯 타이틀 설정
  // setTitle();

  // 이벤트 설정
  applyEvent();
};

self.onDataUpdated = function () {
  parseData();
  sortData();
  makeTable();

  self.ctx.detectChanges();
  self.onResize();
};

self.onResize = function () {
  let custom = self.ctx.custom;
  // 위젯 전체 크기 조절
  const originWidth = self.ctx.settings.widget.widgetSize;
  let widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  custom.$widget.css('font-size', `${widgetFontSize}px`);

  // Header와 Footer Height를 제외한 영역을 Main의 Height로 설정
  let headerHeight = custom.$widgetHeader.outerHeight(true);
  custom.$widgetContent.css('height', `calc(100% - ${headerHeight}px)`);
};

self.onEditModeChanged = function () {
  if (self.ctx.isEdit == true) {
    $('.add-btn-box', self.ctx.$container).css('display', 'none');
  } else {
    $('.add-btn-box', self.ctx.$container).css('display', 'flex');
  }
};

self.actionSources = function () {
  return {
    actionCustomButton: {
      name: 'Action Custom Button',
      multiple: false,
    },
    actionCellButton: {
      name: 'widget-action.action-cell-button',
      multiple: true,
    },
  };
};

self.typeParameters = function () {
  return {
    maxDatasources: -1, // 데이터 소스 1개로 제한
    maxDataKeys: -1, // 데이터 키 1개로 제한
    dataKeysOptional: false, // 데이터 키 1개 이상 필수
  };
};

function defineVariables() {
  let custom = (self.ctx.custom = {});
  let $container = self.ctx.$container;
  let settings = self.ctx.settings;
  let $scope = self.ctx.$scope;

  // Define Tags
  custom.$widget = $('#widget', $container);
  custom.$widgetHeader = $('.widget-header', $container);
  custom.$widgetTitle = $('.widget-title', $container);
  custom.$widgetAction = $('.widget-action', $container);
  custom.$widgetContent = $('.widget-content', $container);
  custom.$widgetFooter = $('.widget-footer', $container);

  custom.$thead = $('.thead', $container);
  custom.$tbody = $('.tbody', $container);

  // 초기 정렬값
  custom.sortColumn = 'name';
  custom.sortDec = false;
  custom.sort = false;

  // 업데이트 허용 parameter 기본값
  custom.update = true;

  custom.headList = [
    '구분',
    '토양 온도 1 (°C)',
    '토양 온도 2 (°C)',
    '토양 수분 1 (%)',
    '토양 수분 2 (%)',
    '토양 EC 1 (μs/cm)',
    '토양 EC 2 (μs/cm)',
  ];

  custom.keyList = ['name', 'temperature1', 'temperature2', 'humidity1', 'humidity2', 'ec1', 'ec2'];
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
  self.ctx.custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);
}

// self.ctx.$scope에 HTML과 연동되는 메서드 추가
function applyEvent() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;
  let settings = self.ctx.settings;
}

function parseData() {
  if (self.ctx.datasources[0].type !== 'function') {
    let parsedDataObj1 = {};

    for (let i in self.ctx.data) {
      // 첫 데이터여서 선언되지 않았을 경우 {} 선언해주기 ( 원래 name으로 했는데, user에서 name없을때 entity 중복되는 경우 발생하여 entityId로 대체함)
      if (parsedDataObj1[self.ctx.data[i].datasource.entityId] == undefined) {
        parsedDataObj1[self.ctx.data[i].datasource.entityId] = {};
      }
      // subscription 데이터 넣기
      parsedDataObj1[self.ctx.data[i].datasource.entityId][self.ctx.data[i].dataKey.name] = self.ctx.data[i].data[0][1];

      // 액션에 사용할 entity 정보 추가
      if (parsedDataObj1[self.ctx.data[i].datasource.entityId].entity == undefined) {
        // entity = {id : {entityType:"", id: ""}, label: "", name: ""}
        parsedDataObj1[self.ctx.data[i].datasource.entityId].entity = self.ctx.data[i].datasource.entity;
      }

      // // 데이터 키 별 조건 처리에 사용할 스키마 정보 추가
      // if (data[self.ctx.data[i].datasource.entityId][self.ctx.data[i].dataKey.name + 'DataSchema'] == undefined) {
      //   // dataKey = {style: true, styleFunction:"", transform:true, transformFunction:""}
      //   data[self.ctx.data[i].datasource.entityId][self.ctx.data[i].dataKey.name + 'DataSchema'] =
      //     self.ctx.data[i].dataKey.settings;
      // }
    }
    let parsedDataObj2 = {};
    for (let i in parsedDataObj1) {
      let targetLabel = parsedDataObj1[i].entity.label;
      let targetIndex = targetLabel.charAt(targetLabel.length - 1);

      let bedIndex = Math.floor(targetIndex / 2) + (targetIndex % 2);
      let keyIndex = targetIndex % 2 === 0 ? 2 : 1;

      if (parsedDataObj2['Bed' + bedIndex] == undefined) {
        parsedDataObj2['Bed' + bedIndex] = {};
      }
      for (let j in parsedDataObj1[i]) {
        parsedDataObj2['Bed' + bedIndex][j + keyIndex] = parsedDataObj1[i][j];
      }
    }

    self.ctx.custom.jsonData = [];

    for (let i in parsedDataObj2) {
      let parsedDataObj3 = {};

      parsedDataObj3.name = i;

      for (let j in parsedDataObj2[i]) {
        parsedDataObj3[j] = parsedDataObj2[i][j];
      }

      self.ctx.custom.jsonData.push(parsedDataObj3);
    }
  }

  // 위젯 저장소에서 보여줄 데이터
  else {
    self.ctx.custom.jsonData = [
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
      { name: '남궁민수', job: '기관사', age: 50, hobby: '노래듣기' },
      { name: '유재석', job: 'MC', age: 40, hobby: '운동' },
      { name: '박명수', job: '개그맨', age: 42, hobby: '영어' },
      { name: '정준하', job: '엔터테이너', age: 41, hobby: '맛집탐방' },
      { name: '정형돈', job: '개그맨', age: 36, hobby: '잠자기' },
    ];
  }
}

function sortData() {
  let custom = self.ctx.custom;

  if (custom.jsonData !== undefined) {
    custom.jsonData.sort((a, b) => {
      // 내림차순 일 때
      if (custom.sortDec) {
        if (a[custom.sortColumn] == b[custom.sortColumn]) {
          return 0;
        }
        return a[custom.sortColumn] > b[custom.sortColumn] ? -1 : 1;
      }
      // 오름차순 일 때
      else {
        if (a[custom.sortColumn] == b[custom.sortColumn]) {
          return 0;
        }
        return a[custom.sortColumn] > b[custom.sortColumn] ? 1 : -1;
      }
    });
  }
}

function makeTable() {
  // 테이블 헤드 만들기
  makeTableHead();

  if (self.ctx.custom.jsonData !== undefined) {
    // 데이터들 중에 현재 보여주는 데이터 계산 후 배열로 분리

    // 테이블 셀 만들기
    makeTableCell();
  }
}

function makeTableHead() {
  let custom = self.ctx.custom;

  // 테이블 헤드 만들기
  custom.$thead.empty();

  let $tr = $(`<tr></tr>`);
  for (let i in custom.headList) {
    let $th = $(`<th>${custom.headList[i]}</th>`);

    // 기본 헤드 만들기
    makeTHead($tr, $th, custom.headList[i], custom.keyList[i]);
  }
  // 액션 헤드 만들기
  makeTHeadAction($tr);

  custom.$thead.append($tr);
}

function makeTHead($tr, $th, label, head) {
  let custom = self.ctx.custom;

  // 정렬 칼럼만 'selected' class 달아주기
  if (custom.sortDec) {
    if (custom.sortColumn == head) {
      $th = $(`<th>${label} ↓</th>`);
    }
  } else {
    if (custom.sortColumn == head) {
      $th = $(`<th>${label} ↑</th>`);
    }
  }

  // 칼럼 클릭 시 정렬조건에 따라 리렌더링
  $th.on('click', () => {
    custom.sort = true;
    // 같은 정렬 칼럼일 경우 오름/내림차순 전환
    if (custom.sortColumn == head) {
      custom.sortDec = !custom.sortDec;
    } else {
      custom.sortDec = true;
    }
    custom.sortColumn = head;
    sortData();
    makeTable();

    self.ctx.detectChanges();
    self.onResize();
  });
  $tr.append($th);
}

function makeTHeadAction($tr) {
  // 위젯 저장소에선 액션 방지
  if (self.ctx.datasources[0].type !== 'function') {
    // 액션 있을 경우 액션 칼럼 추가
    if (self.ctx.actionsApi.getActionDescriptors('actionCellButton').length > 0) {
      let $th = $(`<th></th>`);
      // 액션 수에 따른 칼럼 너비 조정
      $tr.append($th);
    }
  }
}

function makeTableCell() {
  let custom = self.ctx.custom;

  custom.$tbody.empty();
  // row 셀 만들기
  for (let i in custom.jsonData) {
    let $tr = $(`<tr></tr>`);
    for (let j of custom.keyList) {
      let $td = $(`<td>${custom.jsonData[i][j]}</td>`);

      // CSS 스타일 함수가 선언되있고 사용 체크되어 있을 경우
      if (custom.jsonData[i][j + 'DataSchema'] !== undefined && custom.jsonData[i][j + 'DataSchema'].style) {
        // 값과 속성정보를 인자로 받는 함수 생성
        let styleFunction = new Function('value', 'rowData', custom.jsonData[i][j + 'DataSchema'].styleFunction);
        $td.css(styleFunction(custom.jsonData[i][j], custom.jsonData[i]));
      }

      // 데이터 파싱 함수가 선언되있고 사용 체크되어 있을 경우
      if (custom.jsonData[i][j + 'DataSchema'] !== undefined && custom.jsonData[i][j + 'DataSchema'].transform) {
        // 값과 속성정보를 인자로 받는 함수 생성
        let transformFunction = new Function(
          'value',
          'rowData',
          'ctx',
          custom.jsonData[i][j + 'DataSchema'].transformFunction
        );
        // 값 덮어씌우기
        $td.html(transformFunction(custom.jsonData[i][j], custom.jsonData[i], self.ctx));
      }
      $tr.append($td);
    }
    // row 끝에 액션 아이콘 넣기
    getActionBtn($tr, i);
    custom.$tbody.append($tr);
  }
}

function getActionBtn($tr, i) {
  let custom = self.ctx.custom;
  // 위젯 저장소에선 액션 방지
  if (self.ctx.datasources[0].type !== 'function') {
    let actions = self.ctx.actionsApi.getActionDescriptors('actionCellButton');
    let $td = $(`<td class='action-btn-box'></td>`);
    for (let j in actions) {
      let $newAction = $(`<mat-icon class="material-icons action-btn">${actions[j].icon}</mat-icon>`);
      $newAction.attr('data-before', actions[j].name);
      $newAction.click(e => {
        self.ctx.actionsApi.handleWidgetAction(
          e,
          actions[j],
          custom.jsonData[i].entity.id,
          custom.jsonData[i].entity.name,
          custom.jsonData[i],
          custom.jsonData[i].entity.label
        );
      });
      $td.append($newAction);
      $tr.append($td);
    }
  }
}
