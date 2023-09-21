self.onInit = async function () {
  defineVariables();
  setTitle();
  applyEvent();
  createTooltip();
  getDashboardParameter();

  if (self.ctx.datasources[0].type != 'function') {
    await getLineData();
    parseData();
  } else {
    getExampleData();
  }

  createChart(0);

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
  custom.$chart = $('.chart', $container);

  // Define Normal Variables
  let now = moment().valueOf();
  custom.startTs = moment('2023-04-01').startOf('date').valueOf();
  custom.endTs = moment('2023-04-15').endOf('date').valueOf();

  custom.activeIdx = 0;

  $scope.active0 = 'active';
  $scope.active1 = '';
  $scope.active2 = '';
  $scope.active3 = '';
  $scope.active4 = '';
  $scope.active5 = '';
  $scope.active6 = '';

  $scope.label = '온도';
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
}

function applyEvent() {
  let $scope = self.ctx.$scope;
  let custom = self.ctx.custom;

  $scope.changeTopic = function (idx) {
    custom.activeIdx = idx;

    $scope.active0 = '';
    $scope.active1 = '';
    $scope.active2 = '';
    $scope.active3 = '';
    $scope.active4 = '';
    $scope.active5 = '';
    $scope.active6 = '';

    $scope['active' + idx] = 'active';

    createChart(idx);
  };

  $scope.download = function () {
    let targetData = custom.lineData[custom.activeIdx];

    let csv = 'timestamp,value' + '\r\n';

    for (let i in targetData) {
      csv += targetData[i].key + ',' + targetData[i].value;
      csv += '\r\n';
    }

    let fileName = `${targetData[0].label}_${moment(custom.startTs).format('YYYY-MM-DD HH:mm:ss')}-${moment(
      custom.endTs
    ).format('YYYY-MM-DD HH:mm:ss')}.csv`;

    let blob = new Blob(['\ufeff' + csv], {
      type: 'application/csv;charset=utf-8;',
    });
    let elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = fileName;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  };
}

function createTooltip() {
  let custom = self.ctx.custom;
  custom.$tooltip = $(`<div></div>`);
  custom.$tooltip.css({
    display: 'none',
    position: 'absolute',
    zIndex: '1',
    fontSize: '1em',
    backgroundColor: '#2a2f33',
    color: 'white',
    border: 'solid 1px black',
    padding: '12px 16px',
    pointerEvents: 'none',
    width: '205px',
  });

  $('body').append(custom.$tooltip);
}

// Extract Dashboard's Parameters
function getDashboardParameter() {
  if (self.ctx.datasources[0].type === 'function') return {};
  let custom = self.ctx.custom;
  custom.dashboardParams = self.ctx.stateController.getStateParams();
  if (!_.isNil(custom.dashboardParams)) {
    if (!_.isNil(custom.dashboardParams.customer)) {
      custom.bed = custom.dashboardParams.customer;
    }
    if (!_.isNil(custom.dashboardParams.startTs)) {
      custom.startTs = custom.dashboardParams.startTs;
    }
    if (!_.isNil(custom.dashboardParams.endTs)) {
      custom.endTs = custom.dashboardParams.endTs;
    }
  }
}

// 전부 다 가져와야된다. 현재 bed에 대해서만
function getLineData() {
  let custom = self.ctx.custom;

  // entityId, KEY List
  let entityList = [];

  let bed = '';
  if (custom.bed != undefined) {
    bed = custom.bed.name;
  }

  switch (bed) {
    case '':
      entityList = [
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'temperature' }, // 온습도 1
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'temperature' }, // 온습도 2
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'temperature' }, // 온습도 3
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'humidity' }, // 온습도 1
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'humidity' }, // 온습도 2
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'humidity' }, // 온습도 3
        { entityId: '6f505530-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 1
        { entityId: '6e89a9d0-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 2
        { entityId: '6f49c580-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 3
        { entityId: '6f500710-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 4
        { entityId: '6e998850-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 5
        { entityId: '6e70caa1-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 6
        { entityId: '6f4cf9d0-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 7
        { entityId: '6f77b350-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 8
        { entityId: '702f1c70-22a4-11ed-862a-4b4efbf37ce8', key: 'illumination' }, // 조도 1
        { entityId: '7027c970-22a4-11ed-862a-4b4efbf37ce8', key: 'illumination' }, // 조도 2
        { entityId: '705939b0-22a4-11ed-862a-4b4efbf37ce8', key: 'CH2' }, // 퀀텀 1
        { entityId: '70c5b720-22a4-11ed-862a-4b4efbf37ce8', key: 'CH2' }, // 퀀텀 2
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'co2' }, // 온습도 1
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'co2' }, // 온습도 2
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'co2' }, // 온습도 3
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'pressure' }, // 온습도 1
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'pressure' }, // 온습도 2
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'pressure' }, // 온습도 3
      ];
      break;
    case 'B1':
      entityList = [
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'temperature' }, // 온습도 1
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'humidity' }, // 온습도 1
        { entityId: '6f505530-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 1
        { entityId: '6e89a9d0-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 2
        { entityId: '702f1c70-22a4-11ed-862a-4b4efbf37ce8', key: 'illumination' }, // 조도 1
        { entityId: '705939b0-22a4-11ed-862a-4b4efbf37ce8', key: 'CH2' }, // 퀀텀 1
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'co2' }, // 온습도 1
        { entityId: '6e70caa0-22a4-11ed-862a-4b4efbf37ce8', key: 'pressure' }, // 온습도 1
      ];
      break;
    case 'B2':
      entityList = [
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'temperature' }, // 온습도 2
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'humidity' }, // 온습도 2
        { entityId: '6f49c580-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 3
        { entityId: '6f500710-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 4
        { entityId: '702f1c70-22a4-11ed-862a-4b4efbf37ce8', key: 'illumination' }, // 조도 1
        { entityId: '705939b0-22a4-11ed-862a-4b4efbf37ce8', key: 'CH2' }, // 퀀텀 1
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'co2' }, // 온습도 2
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'pressure' }, // 온습도 2
      ];
      break;
    case 'B3':
      entityList = [
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'temperature' }, // 온습도 2
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'humidity' }, // 온습도 2
        { entityId: '6e998850-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 5
        { entityId: '6e70caa1-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 6
        { entityId: '7027c970-22a4-11ed-862a-4b4efbf37ce8', key: 'illumination' }, // 조도 2
        { entityId: '70c5b720-22a4-11ed-862a-4b4efbf37ce8', key: 'CH2' }, // 퀀텀 2
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'co2' }, // 온습도 2
        { entityId: '6e7166e0-22a4-11ed-862a-4b4efbf37ce8', key: 'pressure' }, // 온습도 2
      ];
      break;
    case 'B4':
      entityList = [
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'temperature' }, // 온습도 3
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'humidity' }, // 온습도 3
        { entityId: '6f4cf9d0-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 7
        { entityId: '6f77b350-22a4-11ed-862a-4b4efbf37ce8', key: 'ec' }, // 토양 8
        { entityId: '7027c970-22a4-11ed-862a-4b4efbf37ce8', key: 'illumination' }, // 조도 2
        { entityId: '70c5b720-22a4-11ed-862a-4b4efbf37ce8', key: 'CH2' }, // 퀀텀 2
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'co2' }, // 온습도 3
        { entityId: '6e7118c0-22a4-11ed-862a-4b4efbf37ce8', key: 'pressure' }, // 온습도 3
      ];
      break;

    default:
      break;
  }

  let observables = [];

  for (let i in entityList) {
    // 비교 기간 사용 체크 시 data요청
    if (entityList[i] != undefined) {
      observables.push(
        self.ctx.http.get(
          `/api/plugins/telemetry/DEVICE/${entityList[i].entityId}/values/timeseries?interval=${
            24 * 60 * 60 * 1000
          }&agg=AVG&useStrictDataTypes=true&keys=${entityList[i].key}&startTs=${custom.startTs}&endTs=${custom.endTs}`
        )
      );
    } else {
      return new Promise(resolve => resolve());
    }
  }

  return new Promise(resolve => {
    self.ctx.rxjs.forkJoin(observables).subscribe(datas => {
      custom.originData = datas;

      resolve();
    });
  });
}

function parseData() {
  let custom = self.ctx.custom;

  custom.lineData = [];

  // bed 전체 선택인 경우
  if (custom.bed == undefined || custom.bed.name == '') {
    for (let i in custom.originData[0]['temperature']) {
      custom.originData[0]['temperature'][i].key = moment(custom.originData[0]['temperature'][i].ts).format('M월 D일');
      custom.originData[0]['temperature'][i].value =
        (custom.originData[0]['temperature'][i].value +
          custom.originData[1]['temperature'][i].value +
          custom.originData[2]['temperature'][i].value) /
        3;
      custom.originData[0]['temperature'][i].label = '온도';
      custom.originData[0]['temperature'][i].labelUnit = '온도 °C';
      custom.originData[0]['temperature'][i].unit = '°C';
    }

    for (let i in custom.originData[3]['humidity']) {
      custom.originData[3]['humidity'][i].key = moment(custom.originData[3]['humidity'][i].ts).format('M월 D일');
      custom.originData[3]['humidity'][i].value =
        (custom.originData[3]['humidity'][i].value +
          custom.originData[4]['humidity'][i].value +
          custom.originData[5]['humidity'][i].value) /
        3;
      custom.originData[3]['humidity'][i].label = '습도';
      custom.originData[3]['humidity'][i].labelUnit = '습도 %';
      custom.originData[3]['humidity'][i].unit = '%';
    }

    for (let i in custom.originData[6]['ec']) {
      custom.originData[6]['ec'][i].key = moment(custom.originData[6]['ec'][i].ts).format('M월 D일');
      custom.originData[6]['ec'][i].value =
        (custom.originData[6]['ec'][i].value +
          custom.originData[7]['ec'][i].value +
          custom.originData[8]['ec'][i].value +
          custom.originData[9]['ec'][i].value +
          custom.originData[10]['ec'][i].value +
          custom.originData[11]['ec'][i].value +
          custom.originData[12]['ec'][i].value +
          custom.originData[13]['ec'][i].value) /
        8;
      custom.originData[6]['ec'][i].label = '토양EC';
      custom.originData[6]['ec'][i].labelUnit = '토양 EC';
      custom.originData[6]['ec'][i].unit = 'EC';
    }

    for (let i in custom.originData[14]['illumination']) {
      custom.originData[14]['illumination'][i].key = moment(custom.originData[14]['illumination'][i].ts).format(
        'M월 D일'
      );
      custom.originData[14]['illumination'][i].value =
        (custom.originData[14]['illumination'][i].value + custom.originData[15]['illumination'][i].value) / 2;
      custom.originData[14]['illumination'][i].label = '조도';
      custom.originData[14]['illumination'][i].labelUnit = '조도 lux';
      custom.originData[14]['illumination'][i].unit = 'lux';
    }

    for (let i in custom.originData[16]['CH2']) {
      custom.originData[16]['CH2'][i].key = moment(custom.originData[16]['CH2'][i].ts).format('M월 D일');
      custom.originData[16]['CH2'][i].value =
        (custom.originData[16]['CH2'][i].value + custom.originData[17]['CH2'][i].value) / 2;
      custom.originData[16]['CH2'][i].label = '퀀텀';
      custom.originData[16]['CH2'][i].labelUnit = '퀀텀 μmol/㎡';
      custom.originData[16]['CH2'][i].unit = 'μmol/㎡';
    }

    for (let i in custom.originData[18]['co2']) {
      custom.originData[18]['co2'][i].key = moment(custom.originData[18]['co2'][i].ts).format('M월 D일');
      custom.originData[18]['co2'][i].value =
        (custom.originData[18]['co2'][i].value +
          custom.originData[19]['co2'][i].value +
          custom.originData[20]['co2'][i].value) /
        3;
      custom.originData[18]['co2'][i].label = 'CO₂';
      custom.originData[18]['co2'][i].labelUnit = 'CO₂ ppm';
      custom.originData[18]['co2'][i].unit = 'ppm';
    }

    for (let i in custom.originData[21]['pressure']) {
      custom.originData[21]['pressure'][i].key = moment(custom.originData[21]['pressure'][i].ts).format('M월 D일');
      custom.originData[21]['pressure'][i].value =
        (custom.originData[21]['pressure'][i].value +
          custom.originData[22]['pressure'][i].value +
          custom.originData[23]['pressure'][i].value) /
        3;
      custom.originData[21]['pressure'][i].label = '기압';
      custom.originData[21]['pressure'][i].labelUnit = '기압 hPa';
      custom.originData[21]['pressure'][i].unit = 'hPa';
    }

    custom.lineData.push(custom.originData[0]['temperature']);
    custom.lineData.push(custom.originData[3]['humidity']);
    custom.lineData.push(custom.originData[6]['ec']);
    custom.lineData.push(custom.originData[14]['illumination']);
    custom.lineData.push(custom.originData[16]['CH2']);
    custom.lineData.push(custom.originData[18]['co2']);
    custom.lineData.push(custom.originData[21]['pressure']);
  } else {
    for (let i in custom.originData[0]['temperature']) {
      custom.originData[0]['temperature'][i].key = moment(custom.originData[0]['temperature'][i].ts).format('M월 D일');
      custom.originData[0]['temperature'][i].label = '온도';
      custom.originData[0]['temperature'][i].labelUnit = '온도 °C';
      custom.originData[0]['temperature'][i].unit = '°C';
    }

    for (let i in custom.originData[1]['humidity']) {
      custom.originData[1]['humidity'][i].key = moment(custom.originData[1]['humidity'][i].ts).format('M월 D일');
      custom.originData[1]['humidity'][i].label = '습도';
      custom.originData[1]['humidity'][i].labelUnit = '습도 %';
      custom.originData[1]['humidity'][i].unit = '%';
    }

    for (let i in custom.originData[2]['ec']) {
      custom.originData[2]['ec'][i].key = moment(custom.originData[2]['ec'][i].ts).format('M월 D일');
      custom.originData[2]['ec'][i].value =
        (custom.originData[2]['ec'][i].value + custom.originData[3]['ec'][i].value) / 2;
      custom.originData[2]['ec'][i].label = '토양EC';
      custom.originData[2]['ec'][i].labelUnit = '토양 EC';
      custom.originData[2]['ec'][i].unit = 'EC';
    }

    for (let i in custom.originData[4]['illumination']) {
      custom.originData[4]['illumination'][i].key = moment(custom.originData[4]['illumination'][i].ts).format(
        'M월 D일'
      );
      custom.originData[4]['illumination'][i].label = '조도';
      custom.originData[4]['illumination'][i].labelUnit = '조도 lux';
      custom.originData[4]['illumination'][i].unit = 'lux';
    }

    for (let i in custom.originData[5]['CH2']) {
      custom.originData[5]['CH2'][i].key = moment(custom.originData[5]['CH2'][i].ts).format('M월 D일');
      custom.originData[5]['CH2'][i].label = '퀀텀';
      custom.originData[5]['CH2'][i].labelUnit = '퀀텀 μmol/㎡';
      custom.originData[5]['CH2'][i].unit = 'μmol/㎡';
    }

    for (let i in custom.originData[6]['co2']) {
      custom.originData[6]['co2'][i].key = moment(custom.originData[6]['co2'][i].ts).format('M월 D일');
      custom.originData[6]['co2'][i].label = 'CO₂';
      custom.originData[6]['co2'][i].labelUnit = 'CO₂ ppm';
      custom.originData[6]['co2'][i].unit = 'ppm';
    }

    for (let i in custom.originData[7]['pressure']) {
      custom.originData[7]['pressure'][i].key = moment(custom.originData[7]['pressure'][i].ts).format('M월 D일');
      custom.originData[7]['pressure'][i].label = '기압';
      custom.originData[7]['pressure'][i].labelUnit = '기압 hPa';
      custom.originData[7]['pressure'][i].unit = 'hPa';
    }

    custom.lineData.push(custom.originData[0]['temperature']);
    custom.lineData.push(custom.originData[1]['humidity']);
    custom.lineData.push(custom.originData[2]['ec']);
    custom.lineData.push(custom.originData[4]['illumination']);
    custom.lineData.push(custom.originData[5]['CH2']);
    custom.lineData.push(custom.originData[6]['co2']);
    custom.lineData.push(custom.originData[7]['pressure']);
  }
}

function createChart(idx) {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;
  let $container = self.ctx.$container;

  let lineData = self.ctx.custom.lineData[idx];
  let label = lineData[0].labelUnit;
  $scope.label = lineData[0].label;

  let width = 1670;
  let height = 600;

  let marginTop = 0;
  let marginBottom = 60;
  let marginRight = 40;
  let marginLeft = 100;

  if (self.ctx.isMobile) {
    width = 1280;
    height = 230;
  }

  let thickness = 0.2;

  // Compute values.
  const X = d3.map(lineData, d => d.key);
  const Y = d3.map(lineData, d => d.value);

  const defined = (d, i) => !_.isNil(X[i]) && !isNaN(Y[i]);
  const D = d3.map(lineData, defined);

  let xDomain = X;
  const yDomain = [0, d3.max(Y) * 1.2]; // Y축 최대값에 1.2를 곱해서 여백을 넣어 보기 좋게 만들기
  xDomain = new d3.InternSet(xDomain);

  // Omit any barData not present in the x-domain.
  const I = d3.range(X.length).filter(i => xDomain.has(X[i]));

  const xRange = [marginLeft, width - marginRight]; // [left, right]
  const yRange = [height - marginBottom, marginTop]; // [bottom, top]

  // Construct scales, axes, and formats.
  const xScale = d3.scaleBand(xDomain, xRange).padding(thickness).paddingOuter(0.5);
  const yScale = d3.scaleLinear(yDomain, yRange);

  const xAxis = d3
    .axisBottom(xScale)
    .tickSizeOuter(0)
    .tickFormat((d, i) => calculateFormat(d, xDomain));
  const yAxis = d3.axisLeft(yScale).ticks(5).tickSizeOuter(0);

  const svg = d3
    .create('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#fafbfc')
    .on('pointerenter pointermove', pointermoved)
    .on('pointerleave', pointerleft);
  // .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

  createAxis(svg, xAxis, yAxis, marginLeft, marginBottom, height);

  createLineChart(svg, X, Y, D, I, xScale, yScale, thickness, lineData, true, '#28b5b5');

  addBackgroundColor(svg, width, marginLeft, marginRight);

  createGrid(svg, width, marginLeft, marginRight, marginBottom, height);

  createTextAnnotation(svg, [{ label }], width, height, marginTop, marginBottom, marginLeft, marginRight);

  // 초기화한 후 바인딩
  $('.chart svg', $container).detach();
  custom.$chart.html(svg.node());

  function pointermoved(event) {
    let eachBand = xScale.step();
    let i = Math.floor((d3.pointer(event)[0] - xScale(X[0])) / eachBand);

    let target = lineData[i];

    let left = false;

    if ((lineData.length - 1) / 2 >= i) {
      left = true;
    }

    // 차트 여백 커서 예외 처리
    if (target === undefined) return;

    let $content = $(`
  <div style="display: flex; flex-direction: column">
    <div style="display: flex; align-items: center; justify-content: flex-start; padding-bottom: 11px">
      <div style="font-size: 12px; color: white; font-weight: 500;">${target.key}</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #28b5b5;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${target.label}</div>
      </div>
      <div style="font-size: 12px; color: white">${target.value.toFixed(1)} ${target.unit}</div>
    </div>
  </div>`);

    custom.$tooltip.html($content);

    custom.$tooltip.css('display', 'block');

    let xRatio = -50;
    let yRatio = -50;

    if (left) {
      custom.$tooltip
        .css('left', event.pageX - d3.pointer(event)[0] + xScale(X[i]) + eachBand + 100 + 'px')
        .css('top', event.pageY - d3.pointer(event)[1] + yScale(Y[i]) + 'px');
    } else {
      custom.$tooltip
        .css('left', event.pageX - d3.pointer(event)[0] + xScale(X[i]) - 100 + 'px')
        .css('top', event.pageY - d3.pointer(event)[1] + yScale(Y[i]) + 'px');
    }

    if (self.ctx.isMobile)
      custom.$tooltip.css('left', '50%').css('top', event.pageY - d3.pointer(event)[1] + yRange[1] + 'px');

    // 따라다니는 툴팁
    // custom.$tooltip.css('left', event.pageX + 'px').css('top', event.pageY + 'px');
    custom.$tooltip.css('transform', `translate(${xRatio}%, ${yRatio}%)`);
    // custom.$tooltip.attr('transform', `translate(${xScale(X[i]) + eachBand / 2},${yScale(Y[i])})`);
  }
  function pointerleft() {
    custom.$tooltip.css('display', 'none');
  }
}

function createAxis(svg, xAxis, yAxis, marginLeft, marginBottom, height) {
  let settings = self.ctx.settings;

  svg
    .append('g')
    .attr('class', 'yAxis')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(yAxis)
    .call(g => g.select('.domain').style('color', '#b9bdc4'))
    // .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').attr('x2', -4))
    .call(g => g.selectAll('.tick line').style('color', '#b9bdc4'))
    .call(g => g.selectAll('text').attr('style', `color: #5a616f; font-size: 1.2em; font-weight: 300;`))
    .call(g => g.selectAll('text').text(d => d));

  svg
    .append('g')
    .attr('class', 'xAxis')
    .attr('transform', `translate(0,${height - marginBottom + 1})`)
    .call(xAxis)
    .call(g => g.select('.domain').style('color', '#b9bdc4'))
    .call(g => g.selectAll('.tick line').attr('y2', 4))
    .call(g => g.selectAll('.tick line').style('color', '#b9bdc4'))
    .call(g => g.selectAll('text').attr('style', `color: #5a616f; font-size: 1.2em; font-weight: 300;`));
}

function createLineChart(svg, X, Y, D, I, xScale, yScale, thickness, lineData, isLine, color) {
  // Construct a line generator.
  const line = d3
    .line()
    .defined(i => D[i])
    // .curve(d3.curveMonotoneX) // d3.curveLinear는 딱딱 끊어짐
    .x(i => xScale(X[i]) + (xScale.step() * (1 - thickness)) / 2)
    .y(i => yScale(Y[i]));

  svg
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 1.5)
    // .attr('stroke-linecap', 'round')
    // .attr('stroke-linejoin', strokeLinejoin)
    // .attr('stroke-opacity', strokeOpacity)
    .attr('d', line(I))
    .attr('class', isLine ? '' : 'dotted');

  if (isLine) {
    // data point background
    svg
      .append('g')
      .attr('fill', '#FFFFFF')
      .selectAll('rect')
      .data(lineData)
      .join('rect')
      .attr('x', (d, i) => xScale(X[i]) + xScale.bandwidth() / 2 - 8 / 2)
      .attr('y', (d, i) => yScale(Y[i]) - 8 / 2)
      .attr('height', 8)
      .attr('width', 8);

    svg
      .append('g')
      .attr('fill', color)
      .selectAll('rect')
      .data(lineData)
      .join('rect')
      .attr('x', (d, i) => xScale(X[i]) + xScale.bandwidth() / 2 - 4 / 2)
      .attr('y', (d, i) => yScale(Y[i]) - 4 / 2)
      .attr('height', 4)
      .attr('width', 4);
  }

  // data point
  // svg
  //   .selectAll('myCircles')
  //   .data(lineData)
  //   .enter()
  //   .append('circle')
  //   .attr('fill', 'black')
  //   .attr('stroke', 'none')
  //   .attr('cx', (d, i) => xScale(X[i]) + (xScale.step() * (1 - thickness)) / 2)
  //   .attr('cy', (d, i) => yScale(Y2[i]))
  //   .attr('r', 2);
}

function createGrid(svg, width, marginLeft, marginRight, marginBottom, height) {
  svg
    .selectAll('g.xAxis g.tick')
    .append('line')
    .attr('class', 'dotted')
    .attr('y2', (d, i) => marginBottom - height)
    .attr('stroke', '#dee0e5');

  svg
    .selectAll('g.yAxis g.tick')
    .append('line')
    .attr('x2', (d, i) => {
      if (i == 0) return 0;
      return width - marginLeft - marginRight;
    })
    .attr('stroke', '#edeff3');

  // 맨 마지막 우측 x축 하나 추가로 생성
  svg
    .selectAll('g.xAxis')
    .append('g')
    .attr('class', 'tick last-tick')
    .attr('transform', `translate(${width - marginRight},0)`)
    .append('line')
    .attr('y2', (d, i) => marginBottom - height)
    .attr('stroke', '#dee0e5');

  // 맨 마지막 상단 y축 하나 추가로 생성
  svg
    .selectAll('g.yAxis')
    .append('g')
    .attr('class', 'tick last-tick')
    // .attr('transform', `translate(${width - marginRight},0)`)
    .append('line')
    .attr('x2', (d, i) => width - marginLeft - marginRight)
    .attr('stroke', '#dee0e5');
}

function addBackgroundColor(svg, width, marginLeft, marginRight) {
  let heightArray = [];

  svg.selectAll('g.yAxis g.tick').each(function (d, i) {
    let transformString = d3.select(this).attr('transform');
    let regex = /[0-9.]+(?=\))/g;
    heightArray.push(transformString.match(regex)[0]);
  });

  let yScaleBand = +Math.abs(heightArray[0] - heightArray[1]);

  svg
    .selectAll('g.yAxis g.tick')
    .append('rect')
    .attr('y', -1 * yScaleBand)
    .attr('height', yScaleBand)
    .attr('width', width - marginLeft - marginRight)
    .attr('fill', (d, i) => {
      if (i % 2 != 0) return 'white';
      return '#f4f6f8';
    });
}

function createTextAnnotation(svg, annotationData, width, height, marginTop, marginBottom, marginLeft, marginRight) {
  let settings = self.ctx.settings;

  svg
    .append('g')
    .selectAll('text')
    .data(annotationData)
    .enter()
    .append('text')
    .attr('class', 'annotation-text')
    .attr('x', (d, i) => {
      if (i == 0) return marginLeft / 3;
      return width - marginRight / 3;
    })
    .attr('y', (height - marginTop - marginBottom) / 2 + marginTop)
    // .attr('text-anchor', 'middle')
    .attr('style', (d, i) => {
      // if (d.label == '온도 상한값') return 'fill:#eb5721;font-weight:500;';
      // if (d.label == '습도 상한값') return 'fill:#3e88fa;font-weight:500;';
      return 'fill:#1f2229;font-weight:500;writing-mode: vertical-rl;text-anchor: middle;font-family: "Pretendard";font-size: 1.2em;font-weight: 500;';
    })
    .text((d, i) => {
      return d.label;
    });
}

function getExampleData() {
  // 객체배열 data format 객체지향 데이터
  self.ctx.custom.lineData = [
    [
      { key: '01-01', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-02', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-03', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-04', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-05', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-06', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-07', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-08', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-09', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-10', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-11', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-12', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-13', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-14', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
      { key: '01-15', value: Math.floor(Math.random() * 100), label: '온도', labelUnit: '온도 °C', unit: '°C' },
    ],
    [
      { key: '01-01', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-02', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-03', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-04', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-05', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-06', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-07', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-08', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-09', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-10', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-11', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-12', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-13', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-14', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
      { key: '01-15', value: Math.floor(Math.random() * 100), label: '습도', labelUnit: '습도 %', unit: '%' },
    ],
    [
      { key: '01-01', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-02', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-03', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-04', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-05', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-06', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-07', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-08', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-09', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-10', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-11', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-12', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-13', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-14', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
      { key: '01-15', value: Math.floor(Math.random() * 100), label: '토양EC', labelUnit: '토양 EC', unit: 'EC' },
    ],
    [
      { key: '01-01', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-02', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-03', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-04', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-05', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-06', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-07', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-08', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-09', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-10', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-11', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-12', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-13', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-14', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
      { key: '01-15', value: Math.floor(Math.random() * 100), label: '조도', labelUnit: '조도 lux', unit: 'lux' },
    ],
    [
      {
        key: '01-01',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-02',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-03',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-04',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-05',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-06',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-07',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-08',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-09',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-10',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-11',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-12',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-13',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-14',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
      {
        key: '01-15',
        value: Math.floor(Math.random() * 100),
        label: '퀀텀',
        labelUnit: '퀀텀 μmol/㎡',
        unit: 'μmol/㎡',
      },
    ],
    [
      { key: '01-01', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-02', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-03', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-04', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-05', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-06', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-07', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-08', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-09', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-10', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-11', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-12', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-13', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-14', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
      { key: '01-15', value: Math.floor(Math.random() * 100), label: 'CO₂', labelUnit: 'CO₂ ppm', unit: 'ppm' },
    ],
    [
      { key: '01-01', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-02', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-03', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-04', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-05', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-06', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-07', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-08', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-09', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-10', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-11', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-12', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-13', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-14', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
      { key: '01-15', value: Math.floor(Math.random() * 100), label: '기압', labelUnit: '기압 hPa', unit: 'hPa' },
    ],
  ];
}

function calculateFormat(d, xDomain) {
  return d;
  // if (self.ctx.datasources[0].type === 'function') return d;

  const INTERVALS = [60 * 60 * 1000, 24 * 60 * 60 * 1000, 31 * 24 * 60 * 60 * 1000];

  // Set -> Array
  let target = Array.from(xDomain);

  let diff = target[target.length - 1] - target[0];

  if (diff > INTERVALS[2]) return moment(d).format('M월');
  if (diff > INTERVALS[1]) return moment(d).format('MM/DD');
  if (diff > INTERVALS[0]) return moment(d).format('HH:mm');
  if (diff < INTERVALS[0]) return moment(d).format('mm:ss');
}
