self.onInit = async function () {
  defineVariables();
  setTitle();
  insertHeaderAction();
  getDashboardParameter();

  // makeTooltip();

  // await getLineData();
  // parseData();
  getExampleData();

  createChart();

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
  custom.startTs = moment(now).startOf('date').valueOf();
  custom.endTs = moment(now).endOf('date').valueOf();
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
}

// Create Widget Header Action
function insertHeaderAction() {
  let actionDescriptor = self.ctx.actionsApi.getActionDescriptors('widgetHeaderButton');
  for (let i in actionDescriptor) {
    let $headerAction = $(`<i class='material-icons widget-header-action'>${actionDescriptor[i].icon}</i>`);

    $headerAction.on('click', e => {
      self.ctx.actionsApi.handleWidgetAction(
        e,
        actionDescriptor[i],
        self.ctx.datasources[0].entity.id,
        self.ctx.datasources[0].entityName,
        {
          selectedEntity: {
            entityId: self.ctx.datasources[0].entity.id,
            entityName: self.ctx.datasources[0].entityName,
            entityLabel: self.ctx.datasources[0].entityLabel,
          },
          startTs: self.ctx.custom.startTs,
          endTs: self.ctx.custom.endTs,
        },
        self.ctx.datasources[0].entityLabel
      );
    });
    self.ctx.custom.$widgetAction.append($headerAction);
  }
}

// Extract Dashboard's Parameters
function getDashboardParameter() {
  if (self.ctx.datasources[0].type === 'function') return {};
  let custom = self.ctx.custom;
  custom.dashboardParams = self.ctx.stateController.getStateParams();
  if (!_.isNil(custom.dashboardParams)) {
    if (!_.isNil(custom.dashboardParams.startTs)) {
      custom.startTs = custom.dashboardParams.startTs;
    }
    if (!_.isNil(custom.dashboardParams.endTs)) {
      custom.endTs = custom.dashboardParams.endTs;
    }
  }
}

function makeTooltip() {
  $('.line-container', self.ctx.$container).each(function (i, obj) {
    console.log(i, obj);
    $('.level-line', obj).each(function (j, x) {
      console.log(j, x, $(this));
      addTooltip($(this), i, j, '클러스터 수', 37, 42);
    });
  });
}

function addTooltip($target, i, j, label, portion, number) {
  let $content = $(`
  <div style="display: flex; flex-direction: column">
    <div style="display: flex; align-items: center; justify-content: flex-start">
      <div style="font-size: 12px; color: white; margin-left: 8px">${i}</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px">
      <div style="font-size: 12px; color: #adb5bd">${j}</div>
      <div style="font-size: 12px; color: white">${portion} %</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px">
      <div style="font-size: 12px; color: #adb5bd">${label}</div>
      <div style="font-size: 12px; color: white">${number} 개</div>
    </div>
  </div>`);

  $content.css({
    width: '207px',
    height: '120px',
    backgroundColor: '#2a2f33',
    padding: `16px`,
  });

  $target.tooltipster({
    content: $content,
    interactive: true,
    theme: 'tooltipster-transparent',
    trigger: 'hover',
    delay: 0,
  });
}

function getLineData() {
  let custom = self.ctx.custom;
  let settings = self.ctx.settings;

  const KEY = 'TP_energy_kwh';

  let observables = [];
  let entityId = custom.targetEntity;

  // 비교 기간 사용 체크 시 data요청
  if (entityId != undefined && custom.compare) {
    observables.push(
      self.ctx.http.get(
        `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
          INTERVAL[custom.filter]
        }&agg=SUM&useStrictDataTypes=true&keys=${KEY}&startTs=${custom.pastStartTs}&endTs=${custom.pastEndTs}`
      )
    );
  } else {
    return new Promise(resolve => resolve());
  }

  return new Promise(resolve => {
    self.ctx.rxjs.forkJoin(observables).subscribe(datas => {
      if (datas[0] !== undefined && datas[0][KEY] !== undefined) custom.originLineData = datas[0][KEY];

      resolve();
    });
  });
}

function createChart() {
  let custom = self.ctx.custom;
  let $container = self.ctx.$container;

  let barData = self.ctx.custom.barData;
  let lineData = self.ctx.custom.lineData;

  let width = 552;
  let height = 496;

  let marginTop = 10;
  let marginBottom = 40;
  let marginRight = 20;
  let marginLeft = 60;

  if (self.ctx.isMobile) {
    width = 1280;
    height = 230;
  }

  let thickness = 0.2;

  // Compute values.
  const X = d3.map(lineData, d => d.key);
  const Y = d3.map(lineData, d => d.value);
  const Y2 = d3.map(lineData, d => d.value);

  const defined = (d, i) => !_.isNil(X[i]) && !isNaN(Y[i]);
  const D = d3.map(lineData, defined);

  let xDomain = X;
  const yDomain = [0, d3.max(Y) > d3.max(Y2) ? d3.max(Y) * 1.2 : d3.max(Y2) * 1.2]; // Y축 최대값에 1.2를 곱해서 여백을 넣어 보기 좋게 만들기
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
  const yAxis = d3
    .axisLeft(yScale)
    .ticks(height / 40)
    .tickSizeOuter(0);

  const svg = d3
    .create('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#ffffff');
  // .on('pointerenter pointermove', pointermoved)
  // .on('pointerleave', pointerleft);
  // .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

  createAxis(svg, xAxis, yAxis, marginLeft, marginBottom, marginRight, width, height);

  createLineChart(svg, X, Y2, D, I, xScale, yScale, thickness, lineData);

  createGrid(svg, width, marginLeft, marginRight, height);

  // addBackgroundColor(svg, width, marginLeft, marginRight);

  // 초기화한 후 바인딩
  $('.chart svg', $container).detach();
  custom.$chart.html(svg.node());

  function pointermoved(event) {
    let eachBand = xScale.step();
    let i = Math.floor((d3.pointer(event)[0] - marginLeft - X[0] - eachBand / 2) / eachBand);

    let target = barData[i];
    let target2 = lineData[i];

    let left = false;

    if ((barData.length - 1) / 2 >= i) {
      left = true;
    }

    // 차트 여백 커서 예외 처리
    if (target === undefined || target2 === undefined) return;

    let textBox = $(`<div></div>`);
    let contentsBox = $(`<div></div>`);
    let contentsBox2 = $(`<div></div>`);

    textBox.append(
      $(
        `<div style="font-size:12px; color:white; line-height:1.17; margin-bottom:8px;"> ${t(
          'thingplus.page.trend-view.energy-usage-trend'
        )} </div>`
      )
    );
    textBox.append(contentsBox);
    textBox.append(contentsBox2);

    let square = $(
      `<svg viewBox="0 0 100 100" style="width:0.5em; height:0.5em; fill: #74c0fc; display:inline-block;"><rect width="100" height="100" /></svg>`
    );
    let square2 = $(
      `<svg viewBox="0 0 100 100" style="width:0.5em; height:0.5em; fill: #868e96; display:inline-block;"><rect width="100" height="100" /></svg>`
    );

    contentsBox.append(square);
    contentsBox.append(
      $(`<span style="font-size:12px; color:#adb5bd; line-height:2; margin-left:6px;">${target.label} </span>`)
    );
    contentsBox.append(
      $(`<span style="font-size:12px; color:#fff; line-height:2; margin-left:14px;">${target.value} kWh  </span>`)
    );

    contentsBox2.append(square2);
    contentsBox2.append(
      $(`<span style="font-size:12px; color:#adb5bd; line-height:2; margin-left:6px;">${target2.label} </span>`)
    );
    contentsBox2.append(
      $(`<span style="font-size:12px; color:#fff; line-height:2; margin-left:14px;">${target2.value} kWh</span>`)
    );
    custom.$tooltip.html(textBox);

    custom.$tooltip.css('display', 'block');

    let xRatio = -50;
    let yRatio = -50;

    if (left) {
      custom.$tooltip
        .css('left', event.pageX - d3.pointer(event)[0] + xScale(X[i]) + eachBand + 100 + 'px')
        .css('top', event.pageY - d3.pointer(event)[1] + yScale(Y2[i]) + 'px');
    } else {
      custom.$tooltip
        .css('left', event.pageX - d3.pointer(event)[0] + xScale(X[i]) - 100 + 'px')
        .css('top', event.pageY - d3.pointer(event)[1] + yScale(Y2[i]) + 'px');
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

function createAxis(svg, xAxis, yAxis, marginLeft, marginBottom, marginRight, width, height) {
  let settings = self.ctx.settings;

  svg
    .append('g')
    .attr('class', 'xAxis')
    .attr('transform', `translate(0,${height - marginBottom + 1})`)
    .call(xAxis)
    .call(g => g.select('.domain').style('color', '#adb5bd'))
    .call(g => g.selectAll('.tick line').attr('y2', 0))
    .call(g => g.selectAll('text').attr('style', `color: #495057; font-size: 1em;`));

  svg
    .append('g')
    .attr('class', 'yAxis')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(yAxis)
    .call(g => g.select('.domain').style('color', '#dee2e6'))
    .call(g => g.selectAll('.tick line').attr('x2', 0))
    .call(g => g.selectAll('text').attr('style', `color: #adb5bd; font-size: 1em;`));
}

function createLineChart(svg, X, Y2, D, I, xScale, yScale, thickness, lineData) {
  // Construct a line generator.
  const line = d3
    .line()
    .defined(i => D[i])
    .curve(d3.curveMonotoneX) // d3.curveLinear는 딱딱 끊어짐
    .x(i => xScale(X[i]) + (xScale.step() * (1 - thickness)) / 2)
    .y(i => yScale(Y2[i]));

  svg
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', '#868e96')
    .attr('stroke-width', 1.5)
    // .attr('stroke-linecap', 'round')
    // .attr('stroke-linejoin', strokeLinejoin)
    // .attr('stroke-opacity', strokeOpacity)
    .attr('d', line(I));

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
    .attr('fill', '#868e96')
    .selectAll('rect')
    .data(lineData)
    .join('rect')
    .attr('x', (d, i) => xScale(X[i]) + xScale.bandwidth() / 2 - 4 / 2)
    .attr('y', (d, i) => yScale(Y2[i]) - 4 / 2)
    .attr('height', 4)
    .attr('width', 4);

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

function createGrid(svg, width, marginLeft, marginRight, height) {
  svg
    .selectAll('g.yAxis g.tick')
    .append('line')
    .attr('x2', width - marginLeft - marginRight)
    .attr('stroke', '#00000033');
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
      if (i % 2 == 0) return 'white';
      return '#f8f9fa';
    });
}

function getExampleData() {
  self.ctx.custom.barData = [
    { key: '01-01', value: 5, label: '당일 사용량' },
    { key: '01-02', value: 20, label: '당일 사용량' },
    { key: '01-03', value: 80, label: '당일 사용량' },
    { key: '01-04', value: 50, label: '당일 사용량' },
    { key: '01-05', value: 40, label: '당일 사용량' },
    { key: '01-06', value: 5, label: '당일 사용량' },
    { key: '01-07', value: 20, label: '당일 사용량' },
    { key: '01-08', value: 80, label: '당일 사용량' },
    { key: '01-09', value: 50, label: '당일 사용량' },
    { key: '01-10', value: 40, label: '당일 사용량' },
    { key: '01-11', value: 5, label: '당일 사용량' },
    { key: '01-12', value: 20, label: '당일 사용량' },
    { key: '01-13', value: 80, label: '당일 사용량' },
    { key: '01-14', value: 50, label: '당일 사용량' },
    { key: '01-15', value: 40, label: '당일 사용량' },
  ];
  // 객체배열 data format 객체지향 데이터
  self.ctx.custom.lineData = [
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
