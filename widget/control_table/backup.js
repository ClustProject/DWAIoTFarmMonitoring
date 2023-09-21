const STATUS = {
  stopped: { priority: 0, content: 'thingplus.state.stopped', color: 'var(--tb-service-state-stopped)' },
  waiting: { priority: 1, content: 'thingplus.state.waiting', color: 'var(--tb-service-state-waiting)' },
  working: { priority: 2, content: 'thingplus.state.working', color: 'var(--tb-service-state-working)' },
  trial: { priority: 3, content: 'thingplus.state.trial', color: 'var(--tb-service-state-trial)' },
  unconnected: { priority: 4, content: 'thingplus.state.unconnected', color: 'var(--tb-service-state-unconnected)' },
};
const STANDARD_WINDOW_SIZE = 1920 / 100;
self.onInit = async function () {
  self.ctx.custom = {};
  let { custom, $scope } = self.ctx;
  defineVariables();
  setTitle();
  linkEvent();
  getDashboardParameter();
  self.onResize();
  custom.dashboardList = await getDashboardList();
  custom.isInitialize = true;
  self.onDataUpdated();
};

self.onResize = function () {
  self.ctx.custom.resizeThrottle();
};

self.onDataUpdated = function () {
  let { custom, $scope } = self.ctx;
  if (custom.isInitialize) {
    if (!custom.isUpdate) {
      updateView();
    }

    custom.onUpdate();
    self.ctx.detectChanges();
  }
};

self.actionSources = function () {
  return {
    toEdit: {
      name: 'To Edit',
      multiple: false,
    },
    viewChart: {
      name: 'View Chart',
      multiple: false,
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
  let { custom, $scope, $container } = self.ctx;

  // Define Tags
  custom.$widget = $('#widget', $container);
  custom.$widgetHeader = $('.widget-header', $container);
  custom.$widgetTitle = $('.widget-title', $container);
  custom.$widgetContent = $('.widget-content', $container);
  custom.$dateRange = $('.date-range', $container);
  custom.$chartSection = $('.chart-section', $container);

  $scope.legendList = [
    { key: 'stopped', color: 'var(--tb-service-state-stopped)', label: t('thingplus.state.stopped') },
    { key: 'waiting', color: 'var(--tb-service-state-waiting)', label: t('thingplus.state.waiting') },
    { key: 'working', color: 'var(--tb-service-state-working)', label: t('thingplus.state.working') },
    { key: 'trial', color: 'var(--tb-service-state-trial)', label: t('thingplus.state.trial') },
    { key: 'unconnected', color: 'var(--tb-service-state-unconnected)', label: t('thingplus.state.unconnected') },
  ];

  // Define Normal Variables
  custom.resizeThrottle = _.throttle(resize, 200, { trailing: true });
  custom.ownerDatasource = self.ctx.defaultSubscription.configuredDatasources[0];
  custom.rootEntity = custom.ownerDatasource.entity;
  custom.isSample = custom.ownerDatasource.type == 'function';
  custom.hiddenDatasources = self.ctx.datasources.filter(x => x.entityAliasId === custom.ownerDatasource.entityAliasId);
  custom.mainDatasources = self.ctx.datasources.filter(x => x.entityAliasId !== custom.ownerDatasource.entityAliasId);
  custom.originDataKeys = self.ctx.defaultSubscription.configuredDatasources[1].dataKeys;
  custom.targetDatasources = [];
  custom.t = t;
  custom.isInitialize = false;
  custom.isUpdate = false;
  custom.onUpdate = _.throttle(() => updateView(), 60000);
  custom.ymdhms = t('thingplus.time-format.ymdhms');
  custom.ymdhm = t('thingplus.time-format.ymdhm');
  custom.computedStyle = getComputedStyle($container[0]);
  const originWidth = self.ctx.settings.widget.originWidth;
  custom.widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  if (custom.widgetFontSize < 6.25) {
    custom.widgetFontSize = 6.25;
  }
}

// Create Widget Title
function setTitle() {
  let { custom } = self.ctx;
  custom.$widgetTitle.html(t(self.ctx.widget.config.title));
  custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);
}

function linkEvent() {
  let { $scope } = self.ctx;
  $scope.toDetail = function (e) {
    toDetailDashboard();
  };
  $scope.legendEnter = function (e, d) {
    $(`.bar-rect`).addClass('bar-rect-active');
    $(`.bar-rect-${d.key}`).removeClass('bar-rect-active');
    $(`.bar-rect-${d.key}`).addClass('bar-rect-target');
  };
  $scope.legendLeave = function (e, d) {
    $(`.bar-rect`).removeClass('bar-rect-active');
    $(`.bar-rect`).removeClass('bar-rect-target');
  };
}

function getDashboardParameter() {
  let { custom } = self.ctx;
  if (custom.isSample) {
    custom.dashboardParams = {};
    return;
  }
  custom.dashboardParams = self.ctx.stateController.getStateParams();
}

async function getDashboardList() {
  let dashboardList;
  if (self.ctx.currentUser.authority == 'TENANT_ADMIN') {
    dashboardList = await self.ctx.http.get(`/api/tenant/dashboards?pageSize=1024&page=0`).toPromise();
  } else {
    let customerId = self.ctx.currentUser.customerId;
    dashboardList = await self.ctx.http.get(`/api/customer/${customerId}/dashboards?pageSize=1024&page=0`).toPromise();
  }
  let result = {};
  for (let i in dashboardList.data) {
    result[dashboardList.data[i].title] = dashboardList.data[i];
  }
  return result;
}

function resize() {
  let { custom } = self.ctx;
  // 위젯 전체 크기 조절
  let originWidth = self.ctx.settings.widget.originWidth;
  if (self.ctx.isMobile) {
    originWidth = 960;
    if (self.ctx.width < 600) {
      originWidth = 600;
    }
  }
  custom.widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  if (custom.widgetFontSize < 6.25) {
    custom.widgetFontSize = 6.25;
  }
  custom.$widget.css('font-size', `${custom.widgetFontSize}px`);

  // Header Height를 제외한 영역을 Main의 Height로 설정
  let headerHeight = custom.$widgetHeader.outerHeight(true);
  custom.$widgetContent.css('height', `calc(100% - ${headerHeight}px)`);
}

async function updateView() {
  let { custom, $scope } = self.ctx;

  let now = moment().valueOf();
  custom.startTs = moment(now).subtract(7, 'days').valueOf();
  custom.endTs = now;
  $scope.dateRange = `${moment(custom.startTs).format(custom.ymdhms)} ~ ${moment(custom.endTs).format(custom.ymdhms)}`;

  custom.keyDatas = {
    TP_ConnectionState: [{ ts: custom.startTs, value: 'false' }],
    TP_OperationState: [{ ts: custom.startTs, value: 'false' }],
  };
  let datas = await getInitialStatus();
  for (let i in datas) {
    custom.keyDatas[i][0].value = datas[i][0].value;
  }
  loadData();
  drawChart();
}

async function getInitialStatus() {
  let { custom, $scope } = self.ctx;
  if (!custom.isSample) {
    let keys = custom.originDataKeys.map(x => x.name);
    let entityId = custom.mainDatasources[0].entityId;

    return self.ctx.http
      .get(
        `/api/plugins/telemetry/DEVICE/${entityId}/values/timeseries?limit=1&agg=NONE&keys=${keys.join(
          ','
        )}&startTs=0&endTs=${custom.startTs}`
      )
      .toPromise();
  }
}

function loadData() {
  let { custom, $scope } = self.ctx;
  for (let i in self.ctx.data) {
    let target = self.ctx.data[i];
    if (target.data.length > 0) {
      custom.isUpdate = true;
      let name = target.dataKey.name;
      if (!custom.keyDatas[name]) {
        custom.keyDatas[name] = [];
      }
      let tempData = [];
      for (let j = 0; j < target.data.length; j++) {
        if (j == 0) {
          target.data[j][0] = moment(target.data[j][0]).startOf('minute').valueOf();
          tempData.push({ ts: target.data[j][0], value: target.data[j][1] });
        } else {
          if (target.data[j][1] !== target.data[j - 1][1]) {
            target.data[j][0] = moment(target.data[j][0]).startOf('minute').valueOf();
            tempData.push({ ts: target.data[j][0], value: target.data[j][1] });
          }
        }
      }
      target.data = tempData;
      custom.keyDatas[name] = custom.keyDatas[name].concat(target.data);
    }
  }

  // 데이터들의 유일한 시간 값 추출 및 정렬
  custom.timeList = [custom.startTs, custom.endTs];
  for (let i in custom.keyDatas) {
    for (let j in custom.keyDatas[i]) {
      custom.timeList.push(custom.keyDatas[i][j].ts);
    }
  }
  custom.timeList = _.uniq(custom.timeList);
  custom.timeList.sort();

  // 레이블 리스트의 틀 마련
  custom.labelList = [];
  for (let i = 0; i < custom.timeList.length - 1; i++) {
    let nextTime;
    if (i != custom.timeList.length - 1) {
      nextTime = custom.timeList[i + 1];
    } else {
      nextTime = custom.endTs;
    }
    custom.labelList.push({
      device: custom.mainDatasources,
      index: i,
      time: custom.timeList[i],
      nextTime: nextTime,
      status: 'stopped',
    });
  }

  // 각 데이터의 정보를 이용해서 상태와 레이블값 기입
  for (let i in custom.keyDatas) {
    for (let j = 0; j < custom.keyDatas[i].length; j++) {
      let targetValue;
      if (i == 'TP_ConnectionState') {
        if (custom.keyDatas[i][j].value + '' == 'false') {
          targetValue = 'unconnected';
        }
      }
      if (i == 'TP_OperationState') {
        if (custom.keyDatas[i][j].value == 'WORK') {
          targetValue = 'working';
        } else if (custom.keyDatas[i][j].value == 'WAIT') {
          targetValue = 'waiting';
        } else {
          targetValue = 'stopped';
        }
      }

      let startIndex = custom.timeList.indexOf(custom.keyDatas[i][j].ts);
      let endIndex = custom.timeList.length - 1;
      if (j < custom.keyDatas[i].length - 1) {
        endIndex = custom.timeList.indexOf(custom.keyDatas[i][j + 1].ts);
      }
      if (startIndex !== -1) {
        for (let k = startIndex; k < endIndex; k++) {
          if (
            !_.isNil(STATUS[custom.labelList[k].status]) &&
            !_.isNil(targetValue) &&
            STATUS[custom.labelList[k].status].priority <= STATUS[targetValue].priority
          ) {
            custom.labelList[k].status = targetValue;
          }
        }
      }
    }
  }
  for (let i = 0; i < custom.labelList.length; i++) {
    if (i > 0) {
      if (custom.labelList[i].status == custom.labelList[i - 1].status) {
        custom.labelList[i - 1].nextTime = custom.labelList[i].nextTime;
        custom.labelList.splice(i, 1);
        i--;
      }
    }
  }
}

function drawChart() {
  let { custom, $scope } = self.ctx;
  custom.d3Config = {
    viewWidth: 1920,
    barHeight: 10,
    barMargin: 30,
    margin: {
      top: 0,
      right: 96,
      bottom: 40,
      left: 230,
    },
  };
  custom.d3Config.viewHeight =
    custom.d3Config.margin.top +
    custom.d3Config.margin.bottom +
    custom.mainDatasources.length * (2 * custom.d3Config.barMargin + custom.d3Config.barHeight);

  custom.$chartSection.empty();
  // svg 영역 정의
  custom.$d3 = d3
    .select(custom.$chartSection[0])
    .append('svg')
    .attr('viewBox', `0 0 ${custom.d3Config.viewWidth} ${custom.d3Config.viewHeight}`)
    .attr('width', custom.d3Config.viewWidth)
    .attr('height', custom.d3Config.viewHeight);

  drawXAxis();
  drawBar();
}

function drawXAxis() {
  let { custom, $scope } = self.ctx;
  let { viewWidth, viewHeight, margin } = custom.d3Config;
  const width = viewWidth - margin.left - margin.right;
  const height = margin.bottom;

  // xAxis 그리기
  custom.xAxis = d3
    .scaleTime()
    .domain(d3.extent([custom.startTs, custom.endTs]))
    .range([0, width]);
  custom.$xAxis = custom.$d3
    .append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(' + margin.left + ', ' + (viewHeight - height) + ')')
    .style('font-size', '12px')
    .style('font-family', 'var(--tb-config-font-family)')
    .style('color', 'var(--tb-service-font-4)')
    .style('stroke-width', '0.1em')
    .call(
      d3
        .axisBottom(custom.xAxis)
        .ticks(10)
        .tickFormat(date => formatDate(date))
    );
}

function drawBar() {
  let { custom, $scope, $container } = self.ctx;
  let { viewWidth, viewHeight, barMargin, barHeight, margin } = custom.d3Config;
  const x = custom.xAxis;
  custom.$d3
    .append('g')
    .attr('class', 'bar-group')
    .append('rect')
    .attr('class', 'background')
    .attr('width', viewWidth)
    .attr('height', 2 * barMargin + barHeight)
    .attr('fill', 'var(--tb-service-background-2)')
    .attr('stroke', 'var(--tb-service-border-1)');

  // 상태 변화 막대 그리기
  custom.$d3.select('.bar-group').append('g').attr('class', `bar`);
  custom.$d3
    .select(`.bar`)
    .append('g')
    .selectAll('g')
    .data([custom.mainDatasources[0]])
    .enter()
    .append('text')
    .text(function (d) {
      if (d) {
        return d.entityLabel;
      }
      return '';
    })
    .attr('width', margin.left - 40)
    .attr('x', 20)
    .attr('y', margin.top + barMargin + barHeight / 2 + 4)
    .style('font-size', '14px')
    .style('font-family', 'var(--tb-config-font-family)')
    .style('fill', 'var(--tb-service-font-5)')
    .call(dotme);

  custom.$d3
    .select(`.bar`)
    .append('g')
    .selectAll('g')
    .data(custom.labelList)
    .enter()
    .append('rect')
    .attr('class', d => `bar-rect bar-rect-${d.status} tooltip tooltip-${d.index}`)
    .attr('fill', d => {
      if (d.status == 'unconnected' || d.status == 'nodata') {
        return STATUS.unconnected.color;
      } else if (d.status == 'stopped') {
        return STATUS.stopped.color;
      } else if (d.status == 'waiting') {
        return STATUS.waiting.color;
      } else {
        return STATUS.working.color;
      }
    })
    .attr('x', d => margin.left + x(d.time))
    .attr('y', margin.top + barMargin)
    .attr('width', d => x(d.nextTime) - x(d.time))
    .attr('height', barHeight);

  custom.$d3
    .select(`.bar`)
    .append('g')
    .selectAll('g')
    .data([custom.mainDatasources[0]])
    .enter()
    .append('text')
    .attr('class', 'chart-action material-icons')
    .text('edit')
    .attr('x', viewWidth - margin.right + 22)
    .attr('y', margin.top + barMargin + barHeight / 2 + 10)
    .on('click', function (e, d, i) {
      toEdit(d);
    });

  custom.$d3
    .select(`.bar`)
    .append('g')
    .selectAll('g')
    .data([custom.mainDatasources[0]])
    .enter()
    .append('text')
    .attr('class', 'chart-action material-symbols-outlined')
    .text('earthquake')
    .attr('x', viewWidth - margin.right + 52)
    .attr('y', margin.top + barMargin + barHeight / 2 + 10)
    .on('click', function (e, d, i) {
      openChart(d);
    });
  for (let i in custom.labelList) {
    let $content = $('<div></div>');
    $content.css({
      color: 'var(--tb-service-font-0)',
      backgroundColor: 'rgba(0,0,0,0.8)',
      lineHeight: 1.5,
      borderRadius: `${8 / STANDARD_WINDOW_SIZE}vw`,
      padding: `${12 / STANDARD_WINDOW_SIZE}vw`,
    });

    let startTime = moment(custom.labelList[i].time).format(custom.ymdhm);
    let endTime = moment(custom.labelList[i].nextTime).format(custom.ymdhm);
    let $date = $(`<div>${startTime} ~ ${endTime}</div>`);
    $date.css({
      textAlign: 'center',
      fontSize: `${12 / STANDARD_WINDOW_SIZE}vw`,
    });

    let $description = $(`<div></div>`);
    if (custom.labelList[i].status && custom.labelList[i].status !== '') {
      $description.html(`(${t(STATUS[custom.labelList[i].status].content)})`);
    }
    $description.css({
      textAlign: 'center',
      fontSize: `${12 / STANDARD_WINDOW_SIZE}vw`,
    });

    $content.append($date);
    $content.append($description);

    $(`.tooltip-${custom.labelList[i].index}`, $container).tooltipster({
      content: $content,
      interactive: true,
      theme: 'tooltipster-transparent',
      trigger: 'hover',
      delay: 200,
    });
  }
}

function formatDate(date) {
  if (d3.timeHour(date) < date) {
    return d3.timeFormat(t('thingplus.time-format.d3-hm'))(date);
  } else if (d3.timeDay(date) < date) {
    return d3.timeFormat(t('thingplus.time-format.d3-dh'))(date);
  } else {
    return d3.timeFormat(t('thingplus.time-format.d3-md'))(date);
  }
}

function toDetailDashboard() {
  let { custom, $scope } = self.ctx;
  let stateObj = [
    {
      id: 'default',
      params: custom.dashboardParams,
    },
  ];
  let dashboardId = custom.dashboardList['State Timeline'].id.id;
  const state = self.ctx.utils.objToBase64URI(stateObj);
  let regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
  if (regex.test(dashboardId)) {
    let url = `/dashboards/${dashboardId}?state=${state}`;
    self.ctx.router.navigateByUrl(url);
  }
}

function dotme(text) {
  text.each(function () {
    let text = d3.select(this);
    let words = Array.from(text.text());

    let ellipsis = text.text('').append('tspan').attr('class', 'elip').text('...');
    let width = parseFloat(text.attr('width')) - ellipsis.node().getComputedTextLength();
    let numWords = words.length;

    let tspan = text.insert('tspan', ':first-child').text(words.join(''));
    while (tspan.node().getComputedTextLength() > width && words.length) {
      words.pop();
      tspan.text(words.join(''));
    }

    if (words.length === numWords) {
      ellipsis.remove();
    }
  });
}

function t(key, data) {
  let defaultKey = key;
  if (typeof key === 'string') {
    let keyArr = key.split('.');
    defaultKey = keyArr[keyArr.length - 1];
  }
  let result = self.ctx.translate.instant(key, data);
  if (result == key) {
    return defaultKey;
  }
  return result;
}

function toEdit(data) {
  let { custom, $scope } = self.ctx;
  let descriptors = self.ctx.actionsApi.getActionDescriptors('toEdit');
  self.ctx.actionsApi.handleWidgetAction({}, descriptors[0], data.entity.id, data.entityName, custom, data.entityLabel);
}

function openChart(data) {
  let { custom, $scope } = self.ctx;
  let descriptors = self.ctx.actionsApi.getActionDescriptors('viewChart');
  self.ctx.actionsApi.handleWidgetAction({}, descriptors[0], data.entity.id, data.entityName, custom, data.entityLabel);
}
