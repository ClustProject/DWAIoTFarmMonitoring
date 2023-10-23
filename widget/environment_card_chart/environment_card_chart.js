self.onInit = async function () {
  defineVariables();
  setTitle();
  insertHeaderAction();
  createTooltip();
  getDashboardParameter();

  if (self.ctx.datasources[0].type != 'function') {
    await getLineData();
    parseData();
    insertData();

    self.ctx.detectChanges();
  } else {
    getExampleData();
  }

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
  let now = moment().format('HH:mm:ss');
  custom.startTs = moment('2023-05-10').startOf('date').valueOf();
  custom.endTs = moment('2023-05-10 ' + now).valueOf();
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

    $headerAction.on('click', (e) => {
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
    if (!_.isNil(custom.dashboardParams.startTs)) {
      custom.startTs = custom.dashboardParams.startTs;
    }
    if (!_.isNil(custom.dashboardParams.endTs)) {
      custom.endTs = custom.dashboardParams.endTs;
    }
  }
}

function getLineData() {
  let custom = self.ctx.custom;
  let settings = self.ctx.settings;

  const KEY = 'temperature,humidity';

  let observables = [];

  for (let i in self.ctx.datasources) {
    let entityId = self.ctx.datasources[i].entity.id;

    if (entityId != undefined) {
      observables.push(
        self.ctx.http.get(
          `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
            4 * 60 * 60 * 1000
          }&agg=AVG&useStrictDataTypes=true&keys=${KEY}&startTs=${custom.startTs}&endTs=${custom.endTs}`
        )
      );
    } else {
      return new Promise((resolve) => resolve());
    }
  }

  return new Promise((resolve) => {
    self.ctx.rxjs.forkJoin(observables).subscribe((datas) => {
      custom.originData = datas;

      resolve();
    });
  });
}

function parseData() {
  let custom = self.ctx.custom;

  custom.avgTempData = [];
  custom.minTempData = [];
  custom.maxTempData = [];

  for (let i in custom.originData[0].temperature) {
    // avg
    let avgObj = {};
    avgObj.key = moment(custom.originData[0].temperature[i].ts).format('HH:mm');
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
    minObj.key = moment(custom.originData[0].temperature[i].ts).format('HH:mm');
    minObj.value = Math.min(
      custom.originData[0].temperature[i].value,
      custom.originData[1].temperature[i].value,
      custom.originData[2].temperature[i].value
    );
    minObj.label = '온도 Min';

    custom.minTempData.push(minObj);

    // max
    let maxObj = {};
    maxObj.key = moment(custom.originData[0].temperature[i].ts).format('HH:mm');
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
    avgObj.key = moment(custom.originData[0].humidity[i].ts).format('HH:mm');
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
    minObj.key = moment(custom.originData[0].humidity[i].ts).format('HH:mm');
    minObj.value = Math.min(
      custom.originData[0].humidity[i].value,
      custom.originData[1].humidity[i].value,
      custom.originData[2].humidity[i].value
    );
    minObj.label = '습도 Min';

    custom.minHumidData.push(minObj);

    // max
    let maxObj = {};
    maxObj.key = moment(custom.originData[0].humidity[i].ts).format('HH:mm');
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

function insertData() {
  let $scope = self.ctx.$scope;
  let custom = self.ctx.custom;

  let avgTempObj = { value: 0, count: 0 };
  $scope.avgTemp = (
    custom.avgTempData.reduce(function (prev, current) {
      prev.value += current.value;
      prev.count++;
      return prev;
    }, avgTempObj).value / avgTempObj.count
  ).toFixed(1);

  $scope.minTemp = custom.minTempData
    .reduce(function (prev, current) {
      return prev.value < current.value ? prev : current;
    })
    .value.toFixed(1);
  $scope.maxTemp = custom.maxTempData
    .reduce(function (prev, current) {
      return prev.value > current.value ? prev : current;
    })
    .value.toFixed(1);

  let avgHumidObj = { value: 0, count: 0 };
  $scope.avgHumid = (
    custom.avgHumidData.reduce(function (prev, current) {
      prev.value += current.value;
      prev.count++;
      return prev;
    }, avgHumidObj).value / avgHumidObj.count
  ).toFixed(1);
  $scope.minHumid = custom.minHumidData
    .reduce(function (prev, current) {
      return prev.value < current.value ? prev : current;
    })
    .value.toFixed(1);
  $scope.maxHumid = custom.maxHumidData
    .reduce(function (prev, current) {
      return prev.value > current.value ? prev : current;
    })
    .value.toFixed(1);
}

function createChart() {
  let custom = self.ctx.custom;
  let $container = self.ctx.$container;

  let avgTempData = self.ctx.custom.avgTempData;
  let minTempData = self.ctx.custom.minTempData;
  let maxTempData = self.ctx.custom.maxTempData;

  let avgHumidData = self.ctx.custom.avgHumidData;
  let minHumidData = self.ctx.custom.minHumidData;
  let maxHumidData = self.ctx.custom.maxHumidData;

  let annotationData = self.ctx.custom.annotationData;

  let width = 552;
  let height = 496;

  let marginTop = 10;
  let marginBottom = 60;
  let marginRight = 60;
  let marginLeft = 60;

  if (self.ctx.isMobile) {
    width = 1280;
    height = 230;
  }

  let thickness = 0.2;

  // Compute values.
  const X = d3.map(avgTempData, (d) => d.key);
  const Y = d3.map(maxTempData, (d) => d.value);
  const Y2 = d3.map(maxHumidData, (d) => d.value);

  const T0 = d3.map(avgTempData, (d) => d.value);
  const T1 = d3.map(minTempData, (d) => d.value);
  const T2 = d3.map(maxTempData, (d) => d.value);
  const T3 = d3.map(avgHumidData, (d) => d.value);
  const T4 = d3.map(minHumidData, (d) => d.value);
  const T5 = d3.map(maxHumidData, (d) => d.value);

  const defined = (d, i) => !_.isNil(X[i]) && !isNaN(Y[i]);

  const D0 = d3.map(avgTempData, defined);
  const D1 = d3.map(minTempData, defined);
  const D2 = d3.map(maxTempData, defined);
  const D3 = d3.map(avgHumidData, defined);
  const D4 = d3.map(minHumidData, defined);
  const D5 = d3.map(maxHumidData, defined);

  let xDomain = ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00'];
  const yDomain = [0, d3.max(Y) * 1.2]; // Y축 최대값에 1.2를 곱해서 여백을 넣어 보기 좋게 만들기
  const yDomain2 = [0, d3.max(Y2) * 1.2]; // Y축 최대값에 1.2를 곱해서 여백을 넣어 보기 좋게 만들기
  xDomain = new d3.InternSet(xDomain);

  // Omit any barData not present in the x-domain.
  const I = d3.range(X.length).filter((i) => xDomain.has(X[i]));

  const xRange = [marginLeft, width - marginRight]; // [left, right]
  const yRange = [height - marginBottom, marginTop]; // [bottom, top]

  // Construct scales, axes, and formats.
  const xScale = d3.scaleBand(xDomain, xRange).padding(thickness).paddingOuter(0);
  const yScale = d3.scaleLinear(yDomain, yRange);
  const yScale2 = d3.scaleLinear(yDomain2, yRange);

  const xAxis = d3
    .axisBottom(xScale)
    .tickSizeOuter(0)
    .tickFormat((d, i) => calculateFormat(d, xDomain));
  const yAxis = d3.axisLeft(yScale).ticks(7).tickSizeOuter(0);

  const yAxis2 = d3.axisRight(yScale2).ticks(7).tickSizeOuter(0);

  const svg = d3
    .create('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', '#ffffff')
    .on('pointerenter pointermove', pointermoved)
    .on('pointerleave', pointerleft);
  // .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

  createLine(svg, annotationData, yScale, yScale2, width, marginLeft, marginRight, marginTop);

  createAxis(svg, xAxis, yAxis, yAxis2, marginLeft, marginBottom, marginRight, width, height);

  createLineChart(svg, X, T0, D0, I, xScale, yScale, thickness, avgTempData, true, '#eb5721');
  createLineChart(svg, X, T1, D1, I, xScale, yScale, thickness, minTempData, false, '#eb5721');
  createLineChart(svg, X, T2, D2, I, xScale, yScale, thickness, maxTempData, false, '#eb5721');

  createLineChart(svg, X, T3, D3, I, xScale, yScale2, thickness, avgHumidData, true, '#3e88fa');
  createLineChart(svg, X, T4, D4, I, xScale, yScale2, thickness, minHumidData, false, '#3e88fa');
  createLineChart(svg, X, T5, D5, I, xScale, yScale2, thickness, maxHumidData, false, '#3e88fa');

  createGrid(svg, width, marginLeft, marginRight, height);

  createTextAnnotation(svg, annotationData, yScale, yScale2, marginLeft);

  // addBackgroundColor(svg, width, marginLeft, marginRight);

  // 초기화한 후 바인딩
  $('.chart svg', $container).detach();
  custom.$chart.html(svg.node());

  function pointermoved(event) {
    let eachBand = xScale.step();
    let i = Math.floor((d3.pointer(event)[0] - xScale(X[0])) / eachBand);

    let left = false;

    // if ((avgTempData.length - 1) / 2 >= i) {
    //   left = true;
    // }

    let tempColor = '#eb5721';
    let humidColor = '#3e88fa';
    let $content = $(`
  <div style="display: flex; flex-direction: column">
    <div style="display: flex; align-items: center; justify-content: flex-start; padding-bottom: 11px">
      <div style="font-size: 12px; color: white; font-weight: 500;">${avgTempData[i].key}</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${avgTempData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${avgTempData[i].value.toFixed(1)} %</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:2px; display:inline-block;"/>
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${maxTempData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${maxTempData[i].value.toFixed(1)} %</div>
    </div><div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:2px; display:inline-block;"/>
        <hr style="width:4px; border: 2px solid ${tempColor};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${minTempData[i].label}</div>
      </div>
      <div style="font-size: 12px; color: white">${minTempData[i].value.toFixed(1)} %</div>
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

function createLine(svg, annotationData, yScale, yScale2, width, marginLeft, marginRight, marginTop) {
  svg
    .append('g')
    .selectAll('line')
    .data(annotationData)
    .join('line')
    .attr('transform', (d, i) => {
      return i == 0 ? `translate(0,${yScale(d.value)})` : `translate(0,${yScale2(d.value)})`;
    })
    .attr('x1', (d, i) => marginLeft)
    .attr('x2', (d, i) => width - marginRight)
    .attr('stroke-width', 1)
    .attr('stroke', (d, i) => {
      return '#b9bdc4';
    });
}

function createAxis(svg, xAxis, yAxis, yAxis2, marginLeft, marginBottom, marginRight, width, height) {
  let settings = self.ctx.settings;

  svg
    .append('g')
    .attr('class', 'xAxis')
    .attr('transform', `translate(0,${height - marginBottom + 1})`)
    .call(xAxis)
    .call((g) => g.select('.domain').style('color', '#b9bdc4'))
    .call((g) => g.selectAll('.tick line').attr('y2', 0))
    .call((g) => g.selectAll('text').attr('style', `color: #5a616f; font-size: 1.2em; font-weight: 300;`));

  svg
    .append('g')
    .attr('class', 'yAxis')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(yAxis)
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').attr('x2', 0))
    .call((g) => g.selectAll('text').attr('style', `color: #5a616f; font-size: 1.2em; font-weight: 300;`))
    .call((g) => g.selectAll('text').text((d) => d + '℃'));

  svg
    .append('g')
    .attr('class', 'yAxis2')
    .attr('transform', `translate(${width - marginRight},0)`)
    .call(yAxis2)
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').remove())
    .call((g) => g.selectAll('text').attr('style', `color: #5a616f; font-size: 1.2em; font-weight: 300;`))
    .call((g) => g.selectAll('text').text((d) => d + '%'));
}

function createLineChart(svg, X, Y2, D, I, xScale, yScale, thickness, lineData, isLine, color) {
  // Construct a line generator.
  const line = d3
    .line()
    .defined((i) => D[i])
    .curve(d3.curveMonotoneX) // d3.curveLinear는 딱딱 끊어짐
    .x((i) => xScale(X[i]) + (xScale.step() * (1 - thickness)) / 2)
    .y((i) => yScale(Y2[i]));

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

function createGrid(svg, width, marginLeft, marginRight, height) {
  svg
    .selectAll('g.yAxis g.tick')
    .append('line')
    .attr('x2', (d, i) => {
      if (i == 0) return 0;
      return width - marginLeft - marginRight;
    })
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

function createTextAnnotation(svg, annotationData, yScale, yScale2, marginLeft) {
  let settings = self.ctx.settings;

  svg
    .append('g')
    .selectAll('rect')
    .data(annotationData)
    .join('rect')
    .attr('x', marginLeft)
    .attr('y', (d, i) => {
      return i == 0 ? yScale(d.value) - 5 : yScale2(d.value) - 5;
    })
    .attr('rx', 2)
    .attr('height', 15)
    .attr('width', 50)
    .attr('fill', (d, i) => {
      return 'white';
    });
  // .style('stroke', (d, i) => {
  //   return '#dee2e6';
  // });

  svg
    .append('g')
    .selectAll('text')
    .data(annotationData)
    .enter()
    .append('text')
    .attr('class', 'annotation-text')
    .attr('x', marginLeft)
    .attr('y', (d, i) => {
      return i == 0 ? yScale(d.value) + 5 : yScale2(d.value) + 5;
    }) // 하드코딩
    // .attr('text-anchor', 'middle')
    .attr('style', (d, i) => {
      {
        return i == 0 ? 'fill:#eb5721;font-weight:500;' : 'fill:#3e88fa;font-weight:500;';
      }
    })
    .text((d, i) => {
      return d.label;
    });

  // svg
  //   .append('g')
  //   .selectAll('text')
  //   .data(annotationData)
  //   .enter()
  //   .append('text')
  //   .attr('class', 'annotation-text')
  //   .attr('x', (d, i) => xScale(d.key) + (xScaleBandWidth * d.hours) / 2)
  //   .attr('y', yScale(yDomain[1]) * 2 + 17) // 하드코딩
  //   .attr('text-anchor', 'middle')
  //   .text((d, i) => {
  //     if (d.label == '경부하') return '';
  //     return d.label;
  //   });
}

function getExampleData() {
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
