const ENTITY_TYPE = ['device', 'asset', 'customer'];
self.onInit = async function () {
  defineVariables();
  setTitle();
  applyEvent();
  createTooltip();

  if (self.ctx.datasources.length > 0 && self.ctx.datasources[0].type != 'function') {
    let custom = self.ctx.custom;
    custom.rootEntity = self.ctx.datasources[0].entity;
    custom.relations[custom.rootEntity.id.id] = {
      id: custom.rootEntity.id,
      name: custom.rootEntity.name,
      child: [],
    };
    await getHierarchyInfo([custom.relations[custom.rootEntity.id.id]]);
    distributeLevel();
    getDashboardParameter();
    await getGrowingData();
    parseGrowingData();
    await getEnvData();
    parseEnvData();
    await getECData();
    parseECData();
    parseTableData();

    createTopChart();
    createBottomChart();

    sortData();
    makeTable();
    makePagination();
  } else {
    getExampleData();
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

  // Define Normal Variables
  let now = moment().valueOf();
  custom.startTs = moment('2023-02-01').startOf('date').valueOf();
  custom.endTs = moment('2023-02-28').endOf('date').valueOf();

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

  $scope.changeTab = function (idx) {
    $scope.active0 = '';
    $scope.active1 = '';
    $scope['active' + idx] = 'active';
  };

  $scope.download = function () {
    let targetData = custom.tableData;

    let csv = custom.headList.join(',') + '\r\n';

    for (let i in targetData) {
      let valueList = [];
      for (let j in custom.keyList) {
        valueList.push(targetData[i][custom.keyList[j]]);
      }
      csv += valueList.join(',');
      csv += '\r\n';
    }

    let fileName = `생육_환경_데이터_${moment(custom.startTs).format('YYYY-MM-DD HH:mm:ss')}-${moment(
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

// 엔터티들의 관계를 호출하여 relations 객체 생성
function getHierarchyInfo(entities) {
  let custom = self.ctx.custom;
  let promises = [];
  if (entities.length <= 0) {
    return new Promise(resolve => {
      resolve();
    });
  }
  custom.maxDepth++;
  for (let i = 0; i < entities.length; i++) {
    promises.push(self.ctx.entityRelationService.findInfoByFrom(entities[i].id));
  }
  return new Promise(resolve => {
    self.ctx.rxjs.forkJoin(promises).subscribe(async childs => {
      let newChild = [];
      for (let j = 0; j < childs.length; j++) {
        for (let k = 0; k < childs[j].length; k++) {
          if (
            childs[j][k].to.entityType === 'CUSTOMER' ||
            childs[j][k].to.entityType === 'ASSET' ||
            childs[j][k].to.entityType === 'DEVICE'
          ) {
            custom.relations[childs[j][k].to.id] = {
              id: childs[j][k].to,
              name: childs[j][k].toName,
              parent: entities[j],
              child: [],
            };
            custom.relations[entities[j].id.id].child.push(custom.relations[childs[j][k].to.id]);
            if (childs[j][k].to.entityType === 'CUSTOMER' || childs[j][k].to.entityType === 'ASSET') {
              newChild.push(custom.relations[childs[j][k].to.id]);
            }
          }
        }
      }
      await getHierarchyInfo(newChild);

      resolve();
    });
  });
}

// relations를 기반으로 hierarchyInfo에 계층별로 정리
function distributeLevel() {
  let custom = self.ctx.custom;
  let depth = custom.maxDepth;
  let root = custom.relations[custom.rootEntity.id.id];
  root.type = ENTITY_TYPE[depth];
  for (let i in root.child) {
    root.child[i].type = ENTITY_TYPE[depth - 1];
    for (let j in root.child[i].child) {
      root.child[i].child[j].type = ENTITY_TYPE[depth - 2];
      for (let k in root.child[i].child[j].child) {
        root.child[i].child[j].child[k].type = ENTITY_TYPE[depth - 3];
      }
    }
  }
  custom.hierarchyInfo = {
    tenantList: [],
    customerList: [],
    assetList: [],
    deviceList: [],
  };

  for (let i in custom.relations) {
    if (custom.relations[i].type == 'tenant') {
      custom.hierarchyInfo.tenantList.push(custom.relations[i]);
    }
    if (custom.relations[i].type == 'customer') {
      custom.hierarchyInfo.customerList.push(custom.relations[i]);
    }
    if (custom.relations[i].type == 'asset') {
      custom.hierarchyInfo.assetList.push(custom.relations[i]);
    }
    if (custom.relations[i].type == 'device') {
      custom.hierarchyInfo.deviceList.push(custom.relations[i]);
    }
  }
}

function getDashboardParameter() {
  let { custom, $scope } = self.ctx;
  if (custom.isSample) return {};
  custom.dashboardParams = self.ctx.stateController.getStateParams();
  if (custom.dashboardParams) {
    if (custom.dashboardParams.customer) {
      $scope.selectedCustomer = custom.dashboardParams.customer.entityId.id;
    }
    if (custom.dashboardParams.entityId && custom.dashboardParams.entityId.entityType == 'DEVICE') {
      $scope.selectedDevice = custom.dashboardParams.entityId.id;
    }
    if (custom.dashboardParams.startTs) {
      custom.startTs = custom.dashboardParams.startTs;
      $scope.startDate = moment(custom.startTs).toDate();
      $scope.viewStartDate = moment(custom.startTs).format('YYYY-MM-DD');
    }
    if (custom.dashboardParams.endTs) {
      custom.endTs = custom.dashboardParams.endTs;
      $scope.endDate = moment(custom.endTs).toDate();
      $scope.viewEndDate = moment(custom.endTs).format('YYYY-MM-DD');
    }
  }
}

function getGrowingData() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  let deviceList = [];
  // Position 하나
  if ($scope.selectedDevice != '') {
    deviceList.push(custom.relations[$scope.selectedDevice]);
  }
  // Position 전체
  else if ($scope.selectedCustomer != '') {
    deviceList = _.cloneDeep(custom.relations[$scope.selectedCustomer].child);
  }
  // Bed 전체
  else {
    deviceList = _.cloneDeep(custom.hierarchyInfo.deviceList); // CLUST Device만 있음. Relation 방식이라
  }

  const KEY = 'class0,class1,class2,class3,class4,class5,class6';

  let observables = [];

  for (let i in deviceList) {
    // 비교 기간 사용 체크 시 data요청
    if (deviceList[i] != undefined) {
      observables.push(
        self.ctx.http.get(
          `/api/plugins/telemetry/${deviceList[i].id.entityType}/${deviceList[i].id.id}/values/timeseries?keys=${KEY}&startTs=${custom.startTs}&endTs=${custom.endTs}`
        )
      );
    } else {
      return new Promise(resolve => resolve());
    }
  }

  return new Promise(resolve => {
    self.ctx.rxjs.forkJoin(observables).subscribe(datas => {
      custom.originGrowingData = datas;

      resolve();
    });
  });
}

function parseGrowingData() {
  let custom = self.ctx.custom;

  custom.sumObj = {};
  for (let i in custom.originGrowingData) {
    for (let level in custom.originGrowingData[i]) {
      for (let j in custom.originGrowingData[i][level]) {
        // ts, value
        let label = moment(custom.originGrowingData[i][level][j].ts).format('D일');
        let key = level;
        let value = custom.originGrowingData[i][level][j].value;

        /// { 1일 : { class0 : { value : , count : } } }
        if (custom.sumObj[label] == undefined) custom.sumObj[label] = {};
        if (custom.sumObj[label][key] == undefined) custom.sumObj[label][key] = { value: 0, count: 0 };
        custom.sumObj[label][key].value += +value;
        custom.sumObj[label][key].count += 1;
      }
    }
  }

  custom.stackBarData = [];

  for (let label in custom.sumObj) {
    for (let key in custom.sumObj[label]) {
      let obj = {};
      obj.label = label;
      obj.key = key.slice(-1) + '단계';
      obj.value = Math.floor(custom.sumObj[label][key].value);

      custom.stackBarData.push(obj);
    }
  }

  custom.stackBarData = custom.stackBarData.reverse();
}

function getEnvData() {
  let custom = self.ctx.custom;
  let settings = self.ctx.settings;

  const KEY = 'temperature,humidity';

  let observables = [];

  for (let i in self.ctx.datasources) {
    if (
      self.ctx.datasources[i].entityType == 'DEVICE' &&
      self.ctx.datasources[i].entityFilter.deviceType == 'EM500-CO2'
    ) {
      let entityId = self.ctx.datasources[i].entity.id;
      if (entityId != undefined) {
        observables.push(
          self.ctx.http.get(
            `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
              24 * 60 * 60 * 1000
            }&agg=AVG&useStrictDataTypes=true&keys=${KEY}&startTs=${custom.startTs}&endTs=${custom.endTs}`
          )
        );
      } else {
        return new Promise(resolve => resolve());
      }
    }
  }

  return new Promise(resolve => {
    self.ctx.rxjs.forkJoin(observables).subscribe(datas => {
      custom.originData = datas;

      resolve();
    });
  });
}

function parseEnvData() {
  let custom = self.ctx.custom;

  custom.avgTempData = [];
  custom.minTempData = [];
  custom.maxTempData = [];

  for (let i in custom.originData[0].temperature) {
    // avg
    let avgObj = {};
    avgObj.key = moment(custom.originData[0].temperature[i].ts).format('D일');
    avgObj.value = +(
      (custom.originData[0].temperature[i].value +
        custom.originData[1].temperature[i].value +
        custom.originData[2].temperature[i].value) /
      3
    ).toFixed(1);
    avgObj.label = '온도 Avg';

    custom.avgTempData.push(avgObj);

    // min
    let minObj = {};
    minObj.key = moment(custom.originData[0].temperature[i].ts).format('D일');
    minObj.value = Math.min(
      custom.originData[0].temperature[i].value,
      custom.originData[1].temperature[i].value,
      custom.originData[2].temperature[i].value
    );
    minObj.label = '온도 Min';

    custom.minTempData.push(minObj);

    // max
    let maxObj = {};
    maxObj.key = moment(custom.originData[0].temperature[i].ts).format('D일');
    maxObj.value = Math.max(
      custom.originData[0].temperature[i].value,
      custom.originData[1].temperature[i].value,
      custom.originData[2].temperature[i].value
    );
    maxObj.label = '온도 Max';

    custom.maxTempData.push(maxObj);
  }

  custom.avgHumidData = [];
  custom.minHumidData = [];
  custom.maxHumidData = [];

  for (let i in custom.originData[0].humidity) {
    // avg
    let avgObj = {};
    avgObj.key = moment(custom.originData[0].humidity[i].ts).format('D일');
    avgObj.value = +(
      (custom.originData[0].humidity[i].value +
        custom.originData[1].humidity[i].value +
        custom.originData[2].humidity[i].value) /
      3
    ).toFixed(1);
    avgObj.label = '습도 Avg';

    custom.avgHumidData.push(avgObj);

    // min
    let minObj = {};
    minObj.key = moment(custom.originData[0].humidity[i].ts).format('D일');
    minObj.value = Math.min(
      custom.originData[0].humidity[i].value,
      custom.originData[1].humidity[i].value,
      custom.originData[2].humidity[i].value
    );
    minObj.label = '습도 Min';

    custom.minHumidData.push(minObj);

    // max
    let maxObj = {};
    maxObj.key = moment(custom.originData[0].humidity[i].ts).format('D일');
    maxObj.value = Math.max(
      custom.originData[0].humidity[i].value,
      custom.originData[1].humidity[i].value,
      custom.originData[2].humidity[i].value
    );
    maxObj.label = '습도 Max';

    custom.maxHumidData.push(maxObj);
  }

  self.ctx.custom.annotationData = [
    {
      label: '온도 상한값',
      value: '40',
    },
    {
      label: '습도 상한값',
      value: '60',
    },
  ];
}

function getECData() {
  let custom = self.ctx.custom;
  let settings = self.ctx.settings;

  const KEY = 'ec';

  let observables = [];

  for (let i in self.ctx.datasources) {
    if (
      self.ctx.datasources[i].entityType == 'DEVICE' &&
      self.ctx.datasources[i].entityFilter.deviceType == 'EM500-SMT'
    ) {
      let entityId = self.ctx.datasources[i].entity.id;
      if (entityId != undefined) {
        observables.push(
          self.ctx.http.get(
            `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
              24 * 60 * 60 * 1000
            }&agg=AVG&useStrictDataTypes=true&keys=${KEY}&startTs=${custom.startTs}&endTs=${custom.endTs}`
          )
        );
      } else {
        return new Promise(resolve => resolve());
      }
    }
  }

  return new Promise(resolve => {
    self.ctx.rxjs.forkJoin(observables).subscribe(datas => {
      custom.originECData = datas;

      resolve();
    });
  });
}

function parseECData() {
  let custom = self.ctx.custom;

  custom.avgECData = [];

  for (let i in custom.originECData[0].ec) {
    // avg
    let avgObj = {};
    avgObj.key = moment(custom.originECData[0].ec[i].ts).format('D일');
    avgObj.value = +(
      (custom.originECData[0].ec[i].value +
        custom.originECData[1].ec[i].value +
        custom.originECData[2].ec[i].value +
        custom.originECData[3].ec[i].value +
        custom.originECData[4].ec[i].value +
        custom.originECData[5].ec[i].value +
        custom.originECData[6].ec[i].value +
        custom.originECData[7].ec[i].value) /
      8
    ).toFixed(1);
    avgObj.label = '토양 EC';

    custom.avgECData.push(avgObj);
  }
}

function createTopChart() {
  let custom = self.ctx.custom;
  let $container = self.ctx.$container;

  let lineData = self.ctx.custom.lineData;
  let avgHumidData = self.ctx.custom.avgHumidData;

  let stackBarData = self.ctx.custom.stackBarData;

  let width = 1670;
  let height = 375;

  let marginTop = 00;
  let marginBottom = 60;
  let marginRight = 100;
  let marginLeft = 100;

  if (self.ctx.isMobile) {
    width = 1280;
    height = 230;
  }

  let thickness = 0.85;

  const x = d => d.label;
  const y = d => d.value;
  const z = d => d.key;

  // Compute values.
  const X = d3.map(stackBarData, x);
  const Y = d3.map(stackBarData, y);
  const Z = d3.map(stackBarData, z);

  // Compute default x- and z-domains, and unique them.
  let xDomain = X;
  let zDomain = ['0단계', '1단계', '2단계', '3단계', '4단계', '5단계', '6단계'];
  if (zDomain === undefined) zDomain = Z;

  // Compute the default y-domain. Note: diverging stacks can be negative.

  xDomain = new d3.InternSet(xDomain);

  zDomain = new d3.InternSet(zDomain);

  // Omit any data not present in the x- and z-domains.
  const I = d3.range(X.length).filter(i => xDomain.has(X[i]) && zDomain.has(Z[i]));

  const series = d3
    .stack()
    .keys(zDomain)
    .value(([x, I], z) => Y[I.get(z)])
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetDiverging)(
      d3.rollup(
        I,
        ([i]) => i,
        i => X[i],
        i => Z[i]
      )
    )
    .map(s => s.map(d => Object.assign(d, { i: d.data[1].get(s.key) })));

  let extent = d3.extent(series.flat(2));
  extent[1] *= 1.2; // Y축 최대값에 1.2를 곱해서 여백을 넣어 보기 좋게 만들기
  let yDomain = extent;

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

  const color = d3.scaleOrdinal(zDomain, ['#9bc7d9', '#b9d3de', '#d8dee1', '#ebc6ca', '#f09ca0', '#e55e63', '#bd353a']);

  const svg = d3
    .create('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#ffffff')
    .on('pointerenter pointermove', pointermoved)
    .on('pointerleave', pointerleft);

  createAxisTopChart(svg, xAxis, yAxis, marginLeft, marginBottom, height);

  createStackBarChart(svg, series, Z, X, xScale, yScale, color);

  addBackgroundColor(svg, width, marginLeft, marginRight);

  createGrid(svg, width, marginLeft, marginRight, marginBottom, height);

  createTextAnnotation(
    svg,
    [
      {
        label: '딸기 열매 수',
        value: '30',
      },
    ],
    width,
    height,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight
  );

  // 초기화한 후 바인딩
  $('.top-chart svg', $container).detach();
  custom.$topChart.html(svg.node());

  function pointermoved(event) {
    let eachBand = xScale.step();
    let count = Math.floor((d3.pointer(event)[0] - xScale(X[0])) / eachBand);
    let i = Math.floor((d3.pointer(event)[0] - xScale(X[0])) / eachBand) * 7;

    // stackBarData[i]; // 0~6 도합 7개까진 같이 묶어야함

    let left = false;

    if ((xDomain.size - 1) / 2 >= count) {
      left = true;
    }

    // 차트 여백 커서 예외 처리
    if (stackBarData[i] === undefined) return;

    let $content = $(`
  <div style="display: flex; flex-direction: column">
    <div style="display: flex; align-items: center; justify-content: flex-start; padding-bottom: 11px">
      <div style="font-size: 12px; color: white; font-weight: 500;">${stackBarData[i].label}</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #9bc7d9;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${stackBarData[i].key}</div>
      </div>
      <div style="font-size: 12px; color: white">${stackBarData[i].value} 개</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #b9d3de;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${stackBarData[i + 1].key}</div>
      </div>
      <div style="font-size: 12px; color: white">${stackBarData[i + 1].value} 개</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #d8dee1;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${stackBarData[i + 2].key}</div>
      </div>
      <div style="font-size: 12px; color: white">${stackBarData[i + 2].value} 개</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #ebc6ca;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${stackBarData[i + 3].key}</div>
      </div>
      <div style="font-size: 12px; color: white">${stackBarData[i + 3].value} 개</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #f09ca0;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${stackBarData[i + 4].key}</div>
      </div>
      <div style="font-size: 12px; color: white">${stackBarData[i + 4].value} 개</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #e55e63;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${stackBarData[i + 5].key}</div>
      </div>
      <div style="font-size: 12px; color: white">${stackBarData[i + 5].value} 개</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid #bd353a;height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${stackBarData[i + 6].key}</div>
      </div>
      <div style="font-size: 12px; color: white">${stackBarData[i + 6].value} 개</div>
    </div>
  </div>`);

    $content.css({
      // width: '207px',
      height: '180px',
      backgroundColor: '#2a2f33',
      padding: `12px`,
    });

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

function createBottomChart() {
  let custom = self.ctx.custom;
  let $container = self.ctx.$container;

  let avgTempData = self.ctx.custom.avgTempData;
  let minTempData = self.ctx.custom.minTempData;
  let maxTempData = self.ctx.custom.maxTempData;

  let avgHumidData = self.ctx.custom.avgHumidData;
  let minHumidData = self.ctx.custom.minHumidData;
  let maxHumidData = self.ctx.custom.maxHumidData;

  let ecData = self.ctx.custom.avgECData;

  let width = 1670;
  let height = 250;

  let marginTop = 0;
  let marginBottom = 60;
  let marginRight = 100;
  let marginLeft = 100;

  if (self.ctx.isMobile) {
    width = 1280;
    height = 230;
  }

  let thickness = 0.2;

  // Compute values.
  const X = d3.map(avgTempData, d => d.key);
  const Y = d3.map(maxTempData, d => d.value);
  const Y2 = d3.map(maxHumidData, d => d.value);
  const Y3 = d3.map(ecData, d => d.value);

  const T0 = d3.map(avgTempData, d => d.value);
  const T1 = d3.map(minTempData, d => d.value);
  const T2 = d3.map(maxTempData, d => d.value);
  const T3 = d3.map(avgHumidData, d => d.value);
  const T4 = d3.map(minHumidData, d => d.value);
  const T5 = d3.map(maxHumidData, d => d.value);
  const T6 = d3.map(ecData, d => d.value);

  const defined = (d, i) => !_.isNil(X[i]) && !isNaN(Y[i]);

  const D0 = d3.map(avgTempData, defined);
  const D1 = d3.map(minTempData, defined);
  const D2 = d3.map(maxTempData, defined);
  const D3 = d3.map(avgHumidData, defined);
  const D4 = d3.map(minHumidData, defined);
  const D5 = d3.map(maxHumidData, defined);
  const D6 = d3.map(ecData, defined);

  let xDomain = X;
  const yDomain = [0, d3.max(Y) * 1.2]; // Y축 최대값에 1.2를 곱해서 여백을 넣어 보기 좋게 만들기
  const yDomain2 = [0, d3.max(Y2) * 1.2];
  const yDomain3 = [0, d3.max(Y3) * 1.2];
  xDomain = new d3.InternSet(xDomain);

  // Omit any barData not present in the x-domain.
  const I = d3.range(X.length).filter(i => xDomain.has(X[i]));

  const xRange = [marginLeft, width - marginRight]; // [left, right]
  const yRange = [height - marginBottom, marginTop]; // [bottom, top]

  // Construct scales, axes, and formats.
  const xScale = d3.scaleBand(xDomain, xRange).padding(thickness).paddingOuter(0.5);
  const yScale = d3.scaleLinear(yDomain, yRange);
  const yScale2 = d3.scaleLinear(yDomain2, yRange);
  const yScale3 = d3.scaleLinear(yDomain3, yRange);

  const xAxis = d3
    .axisBottom(xScale)
    .tickSizeOuter(0)
    .tickFormat((d, i) => calculateFormat(d, xDomain));

  const yAxis = d3.axisLeft(yScale).ticks(5).tickSizeOuter(0);

  const yAxis2 = d3.axisRight(yScale2).ticks(5).tickSizeOuter(0);

  const svg = d3
    .create('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#ffffff')
    .on('pointerenter pointermove', pointermoved)
    .on('pointerleave', pointerleft);
  // .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

  createAxisBottomChart(svg, xAxis, yAxis, yAxis2, marginLeft, marginBottom, marginRight, width, height);

  createLineChart(svg, X, T0, D0, I, xScale, yScale, thickness, avgTempData, true, '#eb5721');
  createLineChart(svg, X, T1, D1, I, xScale, yScale, thickness, minTempData, false, '#eb5721');
  createLineChart(svg, X, T2, D2, I, xScale, yScale, thickness, maxTempData, false, '#eb5721');

  createLineChart(svg, X, T3, D3, I, xScale, yScale2, thickness, avgHumidData, true, '#3e88fa');
  createLineChart(svg, X, T4, D4, I, xScale, yScale2, thickness, minHumidData, false, '#3e88fa');
  createLineChart(svg, X, T5, D5, I, xScale, yScale2, thickness, maxHumidData, false, '#3e88fa');

  createLineChart(svg, X, T6, D6, I, xScale, yScale3, thickness, ecData, true, '#28b5b5');

  createGrid(svg, width, marginLeft, marginRight, marginBottom, height);

  addBackgroundColor(svg, width, marginLeft, marginRight);

  createTextAnnotation(
    svg,
    [
      {
        label: '온도 (℃)',
      },
      {
        label: '습도 (%)',
      },
    ],
    width,
    height,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight
  );

  // 초기화한 후 바인딩
  $('.bottom-chart svg', $container).detach();
  custom.$bottomChart.html(svg.node());

  function pointermoved(event) {
    let eachBand = xScale.step();
    let i = Math.floor((d3.pointer(event)[0] - xScale(X[0])) / eachBand);

    let left = false;

    if ((avgTempData.length - 1) / 2 >= i) {
      left = true;
    }

    // 차트 여백 커서 예외 처리
    if (avgTempData[i] === undefined) return;

    let ecColor = '#28b5b5';
    let tempColor = '#eb5721';
    let humidColor = '#3e88fa';
    let $content = $(`
  <div style="display: flex; flex-direction: column">
    <div style="display: flex; align-items: center; justify-content: flex-start; padding-bottom: 11px">
      <div style="font-size: 12px; color: white; font-weight: 500;">${avgTempData[i].key}</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid ${ecColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${ecData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${ecData[i].value.toFixed(1)} μs/cm</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${avgTempData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${avgTempData[i].value.toFixed(1)} ℃</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:2px; display:inline-block;"/>
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${maxTempData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${maxTempData[i].value.toFixed(1)} ℃</div>
    </div><div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:2px; display:inline-block;"/>
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${minTempData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${minTempData[i].value.toFixed(1)} ℃</div>
    </div><div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid ${humidColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${avgHumidData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${avgHumidData[i].value.toFixed(1)} %</div>
    </div><div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:4px; border: 2px solid ${humidColor};height:0; margin:0; margin-right:2px; display:inline-block;"/>
        <hr style="width:4px; border: 2px solid ${humidColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${maxHumidData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${maxHumidData[i].value.toFixed(1)} %</div>
    </div><div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:4px; border: 2px solid ${humidColor};height:0; margin:0; margin-right:2px; display:inline-block;"/>
        <hr style="width:4px; border: 2px solid ${humidColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${minHumidData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${minHumidData[i].value.toFixed(1)} %</div>
    </div>
  </div>`);

    $content.css({
      // width: '207px',
      height: '180px',
      backgroundColor: '#2a2f33',
      padding: `12px`,
    });

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

function createAxisTopChart(svg, xAxis, yAxis, marginLeft, marginBottom, height) {
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

function createAxisBottomChart(svg, xAxis, yAxis, yAxis2, marginLeft, marginBottom, marginRight, width, height) {
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
    .call(g => g.selectAll('text').text(d => d + '℃'));

  svg
    .append('g')
    .attr('class', 'xAxis')
    .attr('transform', `translate(0,${height - marginBottom + 1})`)
    .call(xAxis)
    .call(g => g.select('.domain').style('color', '#b9bdc4'))
    .call(g => g.selectAll('.tick line').attr('y2', 4))
    .call(g => g.selectAll('.tick line').style('color', '#b9bdc4'))
    .call(g => g.selectAll('text').attr('style', `color: #5a616f; font-size: 1.2em; font-weight: 300;`));

  svg
    .append('g')
    .attr('class', 'yAxis2')
    .attr('transform', `translate(${width - marginRight},0)`)
    .call(yAxis2)
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').remove())
    .call(g => g.selectAll('text').attr('style', `color: #5a616f; font-size: 1.2em; font-weight: 300;`))
    .call(g => g.selectAll('text').text(d => d + '%'));
}

function createStackBarChart(svg, series, Z, X, xScale, yScale, color) {
  svg
    .append('g')
    .selectAll('g')
    .data(series)
    .join('g')
    .attr('fill', ([{ i }]) => color(Z[i]))
    .selectAll('rect')
    .data(d => d)
    .join('rect')
    .attr('x', ({ i }) => xScale(X[i]))
    .attr('y', ([y1, y2]) => Math.min(yScale(y1), yScale(y2)))
    .attr('height', ([y1, y2]) => Math.abs(yScale(y1) - yScale(y2)))
    .attr('width', xScale.bandwidth());
}

function createLineChart(svg, X, Y2, D, I, xScale, yScale, thickness, lineData, isLine, color) {
  // Construct a line generator.
  const line = d3
    .line()
    .defined(i => D[i])
    // .curve(d3.curveMonotoneX) // d3.curveLinear는 딱딱 끊어짐
    .x(i => xScale(X[i]) + (xScale.step() * (1 - thickness)) / 2)
    .y(i => yScale(Y2[i]));

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
      .attr('y', (d, i) => yScale(Y2[i]) - 8 / 2)
      .attr('height', 8)
      .attr('width', 8);

    svg
      .append('g')
      .attr('fill', color)
      .selectAll('rect')
      .data(lineData)
      .join('rect')
      .attr('x', (d, i) => xScale(X[i]) + xScale.bandwidth() / 2 - 4 / 2)
      .attr('y', (d, i) => yScale(Y2[i]) - 4 / 2)
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
    // .attr('class', 'dotted')
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

    if (transformString != null) heightArray.push(transformString.match(regex)[0]);
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
      return '#fafbfc';
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
  self.ctx.custom.stackBarData = [
    {
      label: '1일',
      key: '0단계',
      value: 100,
    },
    {
      label: '1일',
      key: '1단계',
      value: 50,
    },
    {
      label: '1일',
      key: '2단계',
      value: 0,
    },
    {
      label: '1일',
      key: '3단계',
      value: 0,
    },
    {
      label: '1일',
      key: '4단계',
      value: 0,
    },
    {
      label: '1일',
      key: '5단계',
      value: 0,
    },
    {
      label: '1일',
      key: '6단계',
      value: 0,
    },
    {
      label: '2일',
      key: '0단계',
      value: 100,
    },
    {
      label: '2일',
      key: '1단계',
      value: 50,
    },
    {
      label: '2일',
      key: '2단계',
      value: 0,
    },
    {
      label: '2일',
      key: '3단계',
      value: 0,
    },
    {
      label: '2일',
      key: '4단계',
      value: 0,
    },
    {
      label: '2일',
      key: '5단계',
      value: 0,
    },
    {
      label: '2일',
      key: '6단계',
      value: 0,
    },
    {
      label: '3일',
      key: '0단계',
      value: 100,
    },
    {
      label: '3일',
      key: '1단계',
      value: 50,
    },
    {
      label: '3일',
      key: '2단계',
      value: 0,
    },
    {
      label: '3일',
      key: '3단계',
      value: 0,
    },
    {
      label: '3일',
      key: '4단계',
      value: 0,
    },
    {
      label: '3일',
      key: '5단계',
      value: 0,
    },
    {
      label: '3일',
      key: '6단계',
      value: 0,
    },
    {
      label: '4일',
      key: '0단계',
      value: 50,
    },
    {
      label: '4일',
      key: '1단계',
      value: 50,
    },
    {
      label: '4일',
      key: '2단계',
      value: 30,
    },
    {
      label: '4일',
      key: '3단계',
      value: 10,
    },
    {
      label: '4일',
      key: '4단계',
      value: 0,
    },
    {
      label: '4일',
      key: '5단계',
      value: 0,
    },
    {
      label: '4일',
      key: '6단계',
      value: 0,
    },
    {
      label: '5일',
      key: '0단계',
      value: 50,
    },
    {
      label: '5일',
      key: '1단계',
      value: 50,
    },
    {
      label: '5일',
      key: '2단계',
      value: 30,
    },
    {
      label: '5일',
      key: '3단계',
      value: 10,
    },
    {
      label: '5일',
      key: '4단계',
      value: 0,
    },
    {
      label: '5일',
      key: '5단계',
      value: 0,
    },
    {
      label: '5일',
      key: '6단계',
      value: 0,
    },
    {
      label: '6일',
      key: '0단계',
      value: 50,
    },
    {
      label: '6일',
      key: '1단계',
      value: 50,
    },
    {
      label: '6일',
      key: '2단계',
      value: 30,
    },
    {
      label: '6일',
      key: '3단계',
      value: 10,
    },
    {
      label: '6일',
      key: '4단계',
      value: 0,
    },
    {
      label: '6일',
      key: '5단계',
      value: 0,
    },
    {
      label: '6일',
      key: '6단계',
      value: 0,
    },
    {
      label: '7일',
      key: '0단계',
      value: 30,
    },
    {
      label: '7일',
      key: '1단계',
      value: 30,
    },
    {
      label: '7일',
      key: '2단계',
      value: 50,
    },
    {
      label: '7일',
      key: '3단계',
      value: 30,
    },
    {
      label: '7일',
      key: '4단계',
      value: 20,
    },
    {
      label: '7일',
      key: '5단계',
      value: 0,
    },
    {
      label: '7일',
      key: '6단계',
      value: 0,
    },
    {
      label: '8일',
      key: '0단계',
      value: 30,
    },
    {
      label: '8일',
      key: '1단계',
      value: 30,
    },
    {
      label: '8일',
      key: '2단계',
      value: 50,
    },
    {
      label: '8일',
      key: '3단계',
      value: 30,
    },
    {
      label: '8일',
      key: '4단계',
      value: 20,
    },
    {
      label: '8일',
      key: '5단계',
      value: 0,
    },
    {
      label: '8일',
      key: '6단계',
      value: 0,
    },
    {
      label: '9일',
      key: '0단계',
      value: 30,
    },
    {
      label: '9일',
      key: '1단계',
      value: 30,
    },
    {
      label: '9일',
      key: '2단계',
      value: 50,
    },
    {
      label: '9일',
      key: '3단계',
      value: 30,
    },
    {
      label: '9일',
      key: '4단계',
      value: 20,
    },
    {
      label: '9일',
      key: '5단계',
      value: 0,
    },
    {
      label: '9일',
      key: '6단계',
      value: 0,
    },
    {
      label: '10일',
      key: '0단계',
      value: 0,
    },
    {
      label: '10일',
      key: '1단계',
      value: 0,
    },
    {
      label: '10일',
      key: '2단계',
      value: 30,
    },
    {
      label: '10일',
      key: '3단계',
      value: 50,
    },
    {
      label: '10일',
      key: '4단계',
      value: 50,
    },
    {
      label: '10일',
      key: '5단계',
      value: 30,
    },
    {
      label: '10일',
      key: '6단계',
      value: 0,
    },
    {
      label: '11일',
      key: '0단계',
      value: 0,
    },
    {
      label: '11일',
      key: '1단계',
      value: 0,
    },
    {
      label: '11일',
      key: '2단계',
      value: 30,
    },
    {
      label: '11일',
      key: '3단계',
      value: 50,
    },
    {
      label: '11일',
      key: '4단계',
      value: 50,
    },
    {
      label: '11일',
      key: '5단계',
      value: 30,
    },
    {
      label: '11일',
      key: '6단계',
      value: 0,
    },
    {
      label: '12일',
      key: '0단계',
      value: 0,
    },
    {
      label: '12일',
      key: '1단계',
      value: 0,
    },
    {
      label: '12일',
      key: '2단계',
      value: 30,
    },
    {
      label: '12일',
      key: '3단계',
      value: 50,
    },
    {
      label: '12일',
      key: '4단계',
      value: 50,
    },
    {
      label: '12일',
      key: '5단계',
      value: 30,
    },
    {
      label: '12일',
      key: '6단계',
      value: 0,
    },
    {
      label: '13일',
      key: '0단계',
      value: 0,
    },
    {
      label: '13일',
      key: '1단계',
      value: 0,
    },
    {
      label: '13일',
      key: '2단계',
      value: 0,
    },
    {
      label: '13일',
      key: '3단계',
      value: 0,
    },
    {
      label: '13일',
      key: '4단계',
      value: 30,
    },
    {
      label: '13일',
      key: '5단계',
      value: 50,
    },
    {
      label: '13일',
      key: '6단계',
      value: 30,
    },
    {
      label: '14일',
      key: '0단계',
      value: 0,
    },
    {
      label: '14일',
      key: '1단계',
      value: 0,
    },
    {
      label: '14일',
      key: '2단계',
      value: 0,
    },
    {
      label: '14일',
      key: '3단계',
      value: 0,
    },
    {
      label: '14일',
      key: '4단계',
      value: 30,
    },
    {
      label: '14일',
      key: '5단계',
      value: 50,
    },
    {
      label: '14일',
      key: '6단계',
      value: 30,
    },
    {
      label: '15일',
      key: '0단계',
      value: 0,
    },
    {
      label: '15일',
      key: '1단계',
      value: 0,
    },
    {
      label: '15일',
      key: '2단계',
      value: 0,
    },
    {
      label: '15일',
      key: '3단계',
      value: 0,
    },
    {
      label: '15일',
      key: '4단계',
      value: 30,
    },
    {
      label: '15일',
      key: '5단계',
      value: 50,
    },
    {
      label: '15일',
      key: '6단계',
      value: 30,
    },
  ];

  // 객체배열 data format 객체지향 데이터
  self.ctx.custom.avgTempData = [
    { key: '01-01', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-02', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-03', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-04', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-05', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-06', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-07', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-08', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-09', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-10', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-11', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-12', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-13', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-14', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-15', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
  ];

  self.ctx.custom.minTempData = [
    { key: '01-01', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-02', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-03', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-04', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-05', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-06', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-07', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-08', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-09', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-10', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-11', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-12', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-13', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-14', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-15', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
  ];
  self.ctx.custom.maxTempData = [
    { key: '01-01', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-02', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-03', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-04', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-05', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-06', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-07', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-08', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-09', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-10', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-11', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-12', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-13', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-14', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-15', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
  ];

  self.ctx.custom.avgHumidData = [
    { key: '01-01', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-02', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-03', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-04', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-05', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-06', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-07', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-08', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-09', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-10', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-11', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-12', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-13', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-14', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-15', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
  ];
  self.ctx.custom.minHumidData = [
    { key: '01-01', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-02', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-03', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-04', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-05', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-06', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-07', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-08', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-09', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-10', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-11', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-12', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-13', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-14', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-15', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
  ];
  self.ctx.custom.maxHumidData = [
    { key: '01-01', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-02', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-03', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-04', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-05', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-06', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-07', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-08', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-09', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-10', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-11', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-12', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-13', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-14', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
    { key: '01-15', value: Math.floor(Math.random() * 100), label: '전일 사용량' },
  ];

  self.ctx.custom.tableData = [
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

  custom.headList = [
    '날짜',
    '0단계',
    '1단계',
    '2단계',
    '3단계',
    '4단계',
    '5단계',
    '6단계',
    '합계',
    '토양 EC (μs/cm)',
    '온도 Avg (℃)',
    '온도 Max (℃)',
    '온도 Min (℃)',
    '습도 Avg (%)',
    '습도 Max (%)',
    '습도 Min (%)',
  ];
  custom.keyList = [
    'ts',
    'class0',
    'class1',
    'class2',
    'class3',
    'class4',
    'class5',
    'class6',
    'sum',
    'ec',
    'avgTemp',
    'maxTemp',
    'minTemp',
    'avgHumid',
    'maxHumid',
    'minHumid',
  ];

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

function parseTableData() {
  let custom = self.ctx.custom;

  custom.tableData = [];

  for (let i in custom.avgTempData) {
    // { key : '1일', avgTemp : '30', ... , class0 : '50', ... }
    let obj = {};

    let key = custom.avgTempData[i].key;

    obj.key = key;
    obj['ts'] = key;
    obj['avgTemp'] = custom.avgTempData[i].value.toFixed(1);
    obj['maxTemp'] = custom.maxTempData[i].value.toFixed(1);
    obj['minTemp'] = custom.minTempData[i].value.toFixed(1);

    obj['avgHumid'] = custom.avgHumidData[i].value.toFixed(1);
    obj['maxHumid'] = custom.maxHumidData[i].value.toFixed(1);
    obj['minHumid'] = custom.minHumidData[i].value.toFixed(1);

    obj['ec'] = custom.avgECData[i].value;

    let sum = 0;
    for (let level in custom.sumObj[key]) {
      let value = Math.floor(custom.sumObj[key][level].value);
      obj[level] = value;
      sum += value;
    }
    obj['sum'] = sum;

    custom.tableData.push(obj);
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
      let $td = $(`<td>${custom.targetData[i][j]}</td>`);

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
