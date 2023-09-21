const INTERVALS = [
  { diff: 24 * 60 * 60 * 1000, interval: 60 * 60 * 1000 },
  { diff: 7 * 24 * 60 * 60 * 1000, interval: 12 * 60 * 60 * 1000 },
  { diff: 31 * 24 * 60 * 60 * 1000, interval: 24 * 60 * 60 * 1000 },
  { diff: Infinity, interval: 24 * 60 * 60 * 1000 },
];
const COLUMN_LIST = ['timestamp', 'deviceName', 'key', 'value'];

const TELEMETRY_KEY_LIST = [
  'CH2',
  'CH1',
  'illumination',
  'temperature',
  'moisture',
  'ec',
  'humidity',
  'co2',
  'pressure',
];
const LIMIT = 50000; // user devcie 하나 당 한번에 가져올 telemetry 최대 갯수

self.onInit = function () {
  defineVariables();
  setTitle(); // 위젯 타이틀 설정
  applyEvent();

  // 현 사업장 커스터머에 속한 User Device 리스트 만들기
  if (self.ctx.datasources[0].type !== 'function') {
    self.ctx.custom.rootEntity = self.ctx.defaultSubscription.configuredDatasources[0].entity.id;
    getDevice();
  }

  self.onResize();
};

self.onResize = function () {
  const originWidth = 1630;
  self.ctx.custom.widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  self.ctx.custom.$widget.css('font-size', `${self.ctx.custom.widgetFontSize}px`);
};

function defineVariables() {
  let custom = (self.ctx.custom = {});
  let $scope = self.ctx.$scope;
  let $container = self.ctx.$container;

  custom.$widget = $('#widget', $container);
  custom.$widgetTitle = $('.widget-title', $container);
  custom.$titleIcon = $('.title-icon', $container);
  custom.$controller = $('.controller', $container);
  custom.$chartBox = $('.chart-box', $container);
  custom.timeFormat = 'YYYY/MM/DD HH:mm:ss';
  custom.loadData = false;

  $scope.genderList = [
    { label: '전체', value: '' },
    { label: '남성', value: 'M' },
    { label: '여성', value: 'F' },
  ];
  $scope.tempStart = '35.5'; // default value
  $scope.tempEnd = '37.5'; // default value
  $scope.birthStart = '1980'; //defualt value
  $scope.birthEnd = '2000'; //default value
  $scope.selectedGender = ''; // default value

  custom.$circle = $('.circle', $container);
  custom.$progress = $('.progress', $container);
  custom.$searchBtn = $('.search-btn', $container);
  custom.$downBtn = $('.down-btn', $container);

  let now = moment().valueOf();
  $scope.startDate = moment(now).startOf('date').toDate();
  $scope.endDate = moment(now).endOf('date').toDate();
  $scope.viewStartDate = moment($scope.startDate).format('YYYY-MM-DD');
  $scope.viewEndDate = moment($scope.endDate).format('YYYY-MM-DD');
  $scope.start = moment().startOf('date').toDate();
  $scope.end = moment().startOf('date').toDate();
}

// self.ctx.$widgetTitle의 내용과 스타일 변경
function setTitle() {
  let custom = self.ctx.custom;
  let widget = self.ctx.widget;

  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
  self.ctx.custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);

  //위젯 아이콘 적용
  custom.$titleIcon.html(widget.config.titleIcon);
}

function applyEvent() {
  self.ctx.$scope.setStartDate = function (e) {
    let start = moment(e).valueOf();
    self.ctx.$scope.startDate = moment(start).startOf('date').toDate();
    self.ctx.$scope.viewStartDate = moment(start).format('YYYY-MM-DD');
    self.ctx.$scope.start = moment(start).toDate();
  };

  self.ctx.$scope.setEndDate = function (e) {
    let end = moment(e).valueOf();
    self.ctx.$scope.endDate = moment(end).startOf('date').toDate();
    self.ctx.$scope.viewEndDate = moment(end).format('YYYY-MM-DD');
    self.ctx.$scope.end = moment(end).toDate();
  };

  self.ctx.$scope.download = async function () {
    // 다운로드 중 중복 다운 방지
    if (self.ctx.custom.loadData == true) return;
    let custom = self.ctx.custom;
    let $scope = self.ctx.$scope;
    // 조회 시작시 progress바 보여주기, 클릭 비활성화, 다운로드 비활성화

    custom.startTs = moment($scope.start).startOf('day').valueOf();
    custom.endTs = moment($scope.end).endOf('day').valueOf();

    if (custom.endTs - custom.startTs > INTERVALS[2].diff) {
      window.alert('31일이내의 기간만 조회 가능합니다.');
      return;
    }
    startLoading();
    await getData();

    downCSV();
    endLoading();
  };
}

// 유저 디바이스 획득 (AppUser, GatewayUser)
function getDevice() {
  let entityId = self.ctx.custom.rootEntity;
  // 현 사업장 커스터머 아래 AppUser와 GatewayUser 디바이스 검색
  let observables = [];

  observables.push(self.ctx.http.get(`/api/tenant/devices?type=UC502&pageSize=10000&page=0`));
  observables.push(self.ctx.http.get(`/api/tenant/devices?type=EM500-LGT&pageSize=10000&page=0`));
  observables.push(self.ctx.http.get(`/api/tenant/devices?type=EM500-PT100&pageSize=10000&page=0`));
  observables.push(self.ctx.http.get(`/api/tenant/devices?type=EM500-SMT&pageSize=10000&page=0`));
  observables.push(self.ctx.http.get(`/api/tenant/devices?type=EM500-CO2&pageSize=10000&page=0`));

  // observables.push(self.ctx.http.get(`/api/customer/${entityId.id}/devices?type=UC502&pageSize=10000&page=0`));
  // observables.push(self.ctx.http.get(`/api/customer/${entityId.id}/devices?type=EM500-LGT&pageSize=10000&page=0`));
  // observables.push(self.ctx.http.get(`/api/customer/${entityId.id}/devices?type=EM500-PT100&pageSize=10000&page=0`));
  // observables.push(self.ctx.http.get(`/api/customer/${entityId.id}/devices?type=EM500-SMT&pageSize=10000&page=0`));
  // observables.push(self.ctx.http.get(`/api/customer/${entityId.id}/devices?type=EM500-CO2&pageSize=10000&page=0`));
  self.ctx.custom.deviceList = [];
  self.ctx.rxjs.forkJoin(observables).subscribe(response => {
    for (let i in response) {
      for (let j in response[i].data) {
        self.ctx.custom.deviceList.push({
          deviceName: response[i].data[j].label,
          id: response[i].data[j].id,
        });
      }
    }
  });
}
// 조회 시작시 동작
function startLoading() {
  let custom = self.ctx.custom;
  // 조회 시작시 progress바 보여주기, 클릭 비활성화, 다운로드 비활성화

  custom.$progress.css('display', 'inline-block');
  custom.$downBtn.html('불러오는중...');
  custom.$downBtn.css({
    cursor: 'default',
    backgroundColor: '#888888',
  });
  custom.loadData = true;
}

async function getData() {
  let custom = self.ctx.custom;
  let limit = LIMIT;

  //조건에 맞는 telemetry, server attribute 가져오기
  let promisesGetTel = [];
  for (let i = 0; i < custom.deviceList.length; i++) {
    let entityId = custom.deviceList[i].id;
    promisesGetTel.push(
      self.ctx.http.get(
        `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?agg=NONE&limit=${limit}&keys=${TELEMETRY_KEY_LIST}&startTs=${custom.startTs}&endTs=${custom.endTs}`
      )
    );
  }

  try {
    let telemetryResponse = await self.ctx.rxjs.forkJoin(promisesGetTel).toPromise();
    custom.telemetryArr = telemetryResponse;
  } catch (err) {
    console.error('Data Load Failed : ', err);
    endLoading();
    return;
  }
}

function downCSV() {
  let custom = self.ctx.custom;

  console.log(custom.deviceList, custom.telemetryArr);

  // 테이블 맨 윗줄 label 집어넣기
  let csv = COLUMN_LIST.join(',') + '\r\n';

  for (let i in custom.telemetryArr) {
    for (let j in custom.telemetryArr[i])
      for (let k in custom.telemetryArr[i][j]) {
        csv +=
          custom.telemetryArr[i][j][k].ts +
          ',' +
          custom.deviceList[i].deviceName +
          ',' +
          j +
          ',' +
          custom.telemetryArr[i][j][k].value;
        csv += '\r\n';
      }
  }

  let fileName = `${moment(custom.startTs).format('YYYY-MM-DD')}~${moment(custom.endTs).format('YYYY-MM-DD')}.csv`;
  let blob = new Blob(['\ufeff' + csv], {
    type: 'application/csv;charset=utf-8;',
  });
  let elem = window.document.createElement('a');
  elem.href = window.URL.createObjectURL(blob);
  elem.download = fileName;
  document.body.appendChild(elem);
  elem.click();
  document.body.removeChild(elem);
}

// 조회 종료시 동작
function endLoading() {
  // 조회 종료시 progress바 숨기기, 클릭 활성화, 다운로드 활성화
  self.ctx.custom.$progress.css('display', 'none');
  self.ctx.custom.$downBtn.html('다운로드');
  self.ctx.custom.$downBtn.css({
    cursor: 'pointer',
    backgroundColor: '#d59701',
  });

  self.ctx.custom.loadData = false;
}
