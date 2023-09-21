const ENTITY_TYPE = ['device', 'asset', 'customer'];
self.onInit = async function () {
  defineVariables();
  setTitle();
  applyEvent();
  getExampleData();

  if (self.ctx.datasources.length > 0 && self.ctx.datasources[0].type != 'function') {
    sortData();
    makeTable();
    makePagination();
  }

  self.onResize();
};

self.onDestroy = function () {};

self.onDataUpdated = function () {};

self.onResize = function () {
  let custom = self.ctx.custom;
  // 위젯 전체 크기 조절
  const originWidth = self.ctx.settings.widget.originWidth;
  let widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  custom.$widget.css('font-size', `${widgetFontSize}px`);
};

self.actionSources = function () {
  return {
    widgetHeaderButton: {
      name: 'Custom Header Button',
      multiple: true,
    },
  };
};

self.typeParameters = function () {
  return {
    maxDatasources: -1,
    maxDataKeys: -1,
    dataKeysOptional: true,
  };
};

// Define Variables
function defineVariables() {
  let custom = (self.ctx.custom = {});
  let $container = self.ctx.$container;
  let $scope = self.ctx.$scope;

  // Define Tags
  custom.$widget = $('#widget', $container);
  custom.$widgetHeader = $('.widget-header', $container);
  custom.$widgetTitle = $('.widget-title', $container);
  custom.$widgetAction = $('.widget-action', $container);
  custom.$widgetContent = $('.widget-content', $container);
  custom.$widgetFooter = $('.widget-footer', $container);
  custom.$topChart = $('.top-chart', $container);
  custom.$bottomChart = $('.bottom-chart', $container);

  custom.$thead = $('.thead', $container);
  custom.$tbody = $('.tbody', $container);

  // 현재 페이지 기본값
  self.ctx.$scope.currentPage = 1;

  // 스키마에 선택된 한번에 보여줄 row 기본값
  self.ctx.$scope.numPerPage = 15;
  // 초기 정렬값
  custom.sortColumn = 'name';
  custom.sortDec = false;
  custom.sort = false;

  $scope.active0 = 'active';
  $scope.active1 = '';

  // 변수 정의
  custom.relations = {};
  custom.hierarchyInfo = {};
  custom.maxDepth = 0;

  $scope.selectedDevice = '';
  $scope.selectedCustomer = '';
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
}

// self.ctx.$scope에 HTML과 연동되는 메서드 추가
function applyEvent() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;
  let settings = self.ctx.settings;

  $scope.prev = function () {
    // 페이지가 1 일 때 실행 방지
    if ($scope.currentPage !== 1) {
      $scope.currentPage--;
      makeTable();
      makePagination();
    }
  };
  $scope.next = function () {
    // 페이지가 마지막 일 때 실행 방지
    if ($scope.currentPage !== $scope.pageLength) {
      $scope.currentPage++;
      makeTable();
      makePagination();
    }
  };
}

function getExampleData() {
  let custom = self.ctx.custom;

  // Define Normal Variables
  let now = moment().valueOf();
  custom.startTs = moment(now).startOf('date').format('YYYY-MM-DD HH:mm:ss');

  custom.tableData = [
    {
      ts: moment(now)
        .subtract(1 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '예측 기반',
      action: 'ON',
    },
    {
      ts: moment(now)
        .subtract(87, 'minutes')
        .subtract(1 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '예측 기반',
      action: 'OFF',
    },
    {
      ts: moment(now)
        .subtract(87, 'minutes')
        .subtract(2 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '직접 제어',
      action: 'ON',
    },
    {
      ts: moment(now)
        .subtract(1, 'days')
        .subtract(87, 'minutes')
        .subtract(3 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '환경 기반',
      action: 'OFF',
    },
    {
      ts: moment(now)
        .subtract(1, 'days')
        .subtract(87, 'minutes')
        .subtract(4 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '직접 제어',
      action: 'ON',
    },
    {
      ts: moment(now)
        .subtract(2, 'days')
        .subtract(87, 'minutes')
        .subtract(5 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '환경 기반',
      action: 'OFF',
    },
    {
      ts: moment(now)
        .subtract(2, 'days')
        .subtract(87, 'minutes')
        .subtract(6 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '예측 제어',
      action: 'ON',
    },
    {
      ts: moment(now)
        .subtract(3, 'days')
        .subtract(87, 'minutes')
        .subtract(7 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '직접 제어',
      action: 'OFF',
    },
    {
      ts: moment(now)
        .subtract(4, 'days')
        .subtract(87, 'minutes')
        .subtract(8 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '환경 기반',
      action: 'ON',
    },
    {
      ts: moment(now)
        .subtract(5, 'days')
        .subtract(87, 'minutes')
        .subtract(9 * 17, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss'),
      mode: '직접 제어',
      action: 'OFF',
    },
  ];
}

function sortData() {
  let custom = self.ctx.custom;

  if (custom.tableData !== undefined) {
    custom.tableData.sort((a, b) => {
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

  if (self.ctx.custom.tableData !== undefined) {
    // 데이터들 중에 현재 보여주는 데이터 계산 후 배열로 분리
    makeTargetData();
    // 테이블 셀 만들기
    makeTableCell();
  }
}

function makeTableHead() {
  let custom = self.ctx.custom;

  custom.headList = ['발생 시간', '모드', '액션'];
  custom.keyList = ['ts', 'mode', 'action'];

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

function makeTargetData() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  custom.rowLength = custom.tableData.length;
  $scope.pageLength = Math.ceil(custom.rowLength / $scope.numPerPage);

  custom.targetData = custom.tableData.slice(
    ($scope.currentPage - 1) * $scope.numPerPage,
    $scope.currentPage * $scope.numPerPage
  );
}

function makeTableCell() {
  let custom = self.ctx.custom;

  custom.$tbody.empty();
  // row 셀 만들기
  for (let i in custom.targetData) {
    let $tr = $(`<tr></tr>`);
    for (let j of custom.keyList) {
      let $td;
      if (j == 'action') {
        let active = '';
        if (custom.targetData[i][j] == 'ON') active = 'active';
        $td = $(
          `<td><div class="status-box"><div class="status-label ${active}">${custom.targetData[i][j]}</div> 히터</div></td>`
        );
      } else $td = $(`<td>${custom.targetData[i][j]}</td>`);

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
          custom.tableData[i].entity.id,
          custom.tableData[i].entity.name,
          custom.tableData[i],
          custom.tableData[i].entity.label
        );
      });
      $td.append($newAction);
      $tr.append($td);
    }
  }
}

// 페이지네이션 옵션 및 CSS 적용
function makePagination() {
  makeNumBtnList();
}

function makeNumBtnList() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;
  let settings = self.ctx.settings;

  // 1, 2, 3, 4, 5 ... page 선택 리스트 만들기
  custom.$pageList = $('.pageList', self.ctx.$container);

  custom.$pageList.empty();
  // pageListLimit 없을 경우 + 전체 페이지 수가 limit count보다 같거나 작은 경우 (페이지 리스트가 갱신될 일이 없음)
  // if ($scope.pageLength <= settings.pagination.pageListLimitCount) {
  makeNumBtn(1, $scope.pageLength + 1);
  // }
  // // pageListLimit 체크했을 경우
  // else {
  //   sidePageCount = Math.floor(settings.pagination.pageListLimitCount / 2);
  //   // pageListLimitCount가 짝수 일때 currentPage 버튼이 왼쪽에서 두번째 있게끔!
  //   if (settings.pagination.pageListLimitCount % 2 == 0) {
  //     // 페이지가 1페이지보다 작아지는 예외 처리
  //     if ($scope.currentPage - sidePageCount + 1 < 1) {
  //       makeNumBtn(1, settings.pagination.pageListLimitCount + 1);
  //     } else if ($scope.pageLength < $scope.currentPage + sidePageCount) {
  //       makeNumBtn($scope.pageLength - settings.pagination.pageListLimitCount + 1, $scope.pageLength + 1);
  //     } else {
  //       makeNumBtn($scope.currentPage - sidePageCount + 1, $scope.currentPage + sidePageCount + 1);
  //     }
  //   }
  //   // pageListLimitCount가 홀수 일때
  //   else {
  //     // 페이지가 1페이지보다 작아지는 예외 처리
  //     if ($scope.currentPage - sidePageCount < 1) {
  //       makeNumBtn(1, settings.pagination.pageListLimitCount + 1);
  //     }
  //     // 페이지가 끝페이지보다 커지는 예외 처리
  //     else if ($scope.pageLength < $scope.currentPage + sidePageCount) {
  //       makeNumBtn($scope.pageLength - settings.pagination.pageListLimitCount + 1, $scope.pageLength + 1);
  //     } else {
  //       makeNumBtn($scope.currentPage - sidePageCount, $scope.currentPage + sidePageCount + 1);
  //     }
  //   }
  // }
}

function makeNumBtn(startIndex, endIndex) {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  // 1 페이지 중복 예외처리
  if (startIndex != 1) {
    let $page = $(`<div>1</div>`);
    // 1, 2, 3, 4, 5 ... 버튼 클릭 시 페이징 처리
    $page.on('click', () => {
      $scope.currentPage = 1;
      makeTable();
      makePagination();
      self.ctx.detectChanges();
    });
    custom.$pageList.append($page);
    custom.$pageList.append($('<div>...</div>'));
  }

  for (let i = startIndex; i < endIndex; i++) {
    let $page = $(`<div>${i}</div>`);
    // 현재 페이지만 'selected' class 달아주기
    if ($scope.currentPage == i) {
      $page.attr('class', 'selected');
    }
    // 1, 2, 3, 4, 5 ... 버튼 클릭 시 페이징 처리
    $page.on('click', () => {
      $scope.currentPage = i;
      makeTable();
      makePagination();
      self.ctx.detectChanges();
    });
    custom.$pageList.append($page);
  }

  // 끝 페이지 중복 예외처리
  if (endIndex - 1 != $scope.pageLength) {
    let $page = $(`<div>${$scope.pageLength}</div>`);
    // 1, 2, 3, 4, 5 ... 버튼 클릭 시 페이징 처리
    $page.on('click', () => {
      $scope.currentPage = $scope.pageLength;
      makeTable();
      makePagination();
      self.ctx.detectChanges();
    });
    custom.$pageList.append($('<div>...</div>'));
    custom.$pageList.append($page);
  }
}
