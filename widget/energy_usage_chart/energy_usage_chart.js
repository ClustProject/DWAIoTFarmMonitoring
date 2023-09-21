self.onInit = function () {
  defineVariables();
  setTitle();
  loadData();
  createChart();
  self.onResize();
};

self.onResize = function () {
  let custom = self.ctx.custom;
  const originWidth = self.ctx.settings.widget.originWidth;
  let widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  custom.$widget.css('font-size', `${widgetFontSize}px`);

  let headerHeight = custom.$header.outerHeight(true);
  custom.$widgetContent.css('height', `calc(100% - ${headerHeight}px)`);

  if (!_.isNil(custom.chart)) {
    let chartFontSize = _.round(
      (self.ctx.width / self.ctx.settings.widget.originWidth) * self.ctx.settings.font.size,
      2
    );
    custom.chart.options.legend.labels.fontSize = chartFontSize;
    custom.chart.options.scales.xAxes[0].ticks.fontSize = chartFontSize;
    custom.chart.options.scales.yAxes[0].ticks.fontSize = chartFontSize;
    custom.chart.options.scales.xAxes[0].scaleLabel.fontSize = chartFontSize;
    custom.chart.options.scales.yAxes[0].scaleLabel.fontSize = chartFontSize;
    custom.chart.resize();
  }
};

self.typeParameters = function () {
  return {
    maxDatasources: -1,
    maxDataKeys: -1,
    dataKeysOptional: true,
  };
};

function defineVariables() {
  let custom = (self.ctx.custom = {});
  custom.$widget = $('#widget', self.ctx.$container);
  custom.$header = $('.header', custom.$widget);
  custom.$widgetTitle = $('.widget-title', custom.$widget);
  custom.$time = $('.time', custom.$widget);
  custom.$timeHourly = $('.time-hourly', custom.$widget);
  custom.$timeWeekly = $('.time-weekly', custom.$widget);
  custom.$timeDaily = $('.time-daily', custom.$widget);
  custom.$timeMonthly = $('.time-monthly', custom.$widget);
  custom.$widgetContent = $('.widget-content', custom.$widget);

  custom.timeUnit = 'hour';
  custom.now = moment().valueOf();
  custom.current = {
    startTs: moment(custom.now).startOf('day').valueOf(),
    endTs: moment(custom.now).endOf('day').valueOf(),
  };
  custom.previous = {
    startTs: moment(custom.now).startOf('day').subtract(1, 'days').valueOf(),
    endTs: moment(custom.now).endOf('day').subtract(1, 'days').valueOf(),
  };
  custom.interval = 60 * 60 * 1000;

  custom.$timeHourly.on('click', () => {
    custom.timeUnit = 'hour';
    custom.current.startTs = moment(custom.now).startOf('day').valueOf();
    custom.current.endTs = moment(custom.now).endOf('day').valueOf();
    custom.previous.startTs = moment(custom.now).subtract(1, 'days').startOf('day').valueOf();
    custom.previous.endTs = moment(custom.now).subtract(1, 'days').endOf('day').valueOf();
    custom.interval = 60 * 60 * 1000;
    custom.$time.removeClass('active');
    custom.$timeHourly.addClass('active');
    loadData();
  });
  custom.$timeWeekly.on('click', () => {
    custom.timeUnit = 'week';
    custom.current.startTs = moment(custom.now).startOf('week').valueOf();
    custom.current.endTs = moment(custom.now).endOf('week').valueOf();
    custom.previous.startTs = moment(custom.now).subtract(7, 'days').startOf('week').valueOf();
    custom.previous.endTs = moment(custom.now).subtract(7, 'days').endOf('week').valueOf();
    custom.interval = 24 * 60 * 60 * 1000;
    custom.$time.removeClass('active');
    custom.$timeWeekly.addClass('active');
    loadData();
  });
  custom.$timeDaily.on('click', () => {
    custom.timeUnit = 'day';
    custom.current.startTs = moment(custom.now).startOf('month').valueOf();
    custom.current.endTs = moment(custom.now).endOf('month').valueOf();
    custom.previous.startTs = moment(custom.now).subtract(1, 'months').startOf('month').valueOf();
    custom.previous.endTs = moment(custom.now).subtract(1, 'months').endOf('month').valueOf();
    custom.interval = 24 * 60 * 60 * 1000;
    custom.$time.removeClass('active');
    custom.$timeDaily.addClass('active');
    loadData();
  });
  custom.$timeMonthly.on('click', () => {
    custom.timeUnit = 'month';
    custom.current.startTs = moment(custom.now).startOf('year').valueOf();
    custom.current.endTs = moment(custom.now).endOf('year').valueOf();
    custom.previous.startTs = moment(custom.now).subtract(1, 'years').startOf('year').valueOf();
    custom.previous.endTs = moment(custom.now).subtract(1, 'years').endOf('year').valueOf();
    custom.interval = 24 * 60 * 60 * 1000;
    custom.$time.removeClass('active');
    custom.$timeMonthly.addClass('active');
    loadData();
  });
}

// 위젯 타이틀 생성
function setTitle() {
  self.ctx.$scope.title = t(self.ctx.widget.config.title);
  self.ctx.custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);
}

// 데이터 불러오기
function loadData() {
  if (self.ctx.datasources[0].type !== 'function') {
    let custom = self.ctx.custom;
    let entityId = self.ctx.datasources[0].entity.id;
    let keys = ['TP_energy_kwh'];
    let promises = [];
    promises.push(
      self.ctx.http.get(
        `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
          custom.interval
        }&agg=SUM&keys=${keys.join(',')}&startTs=${custom.previous.startTs}&endTs=${custom.previous.endTs}`
      )
    );
    promises.push(
      self.ctx.http.get(
        `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
          custom.interval
        }&agg=SUM&keys=${keys.join(',')}&startTs=${custom.current.startTs}&endTs=${custom.current.endTs}`
      )
    );

    self.ctx.rxjs.forkJoin(promises).subscribe(datas => {
      createDataset();
      custom.chart.data = custom.chartData;
      insertData(datas);
      custom.chart.update();
    });
  }
}

function getLabel() {
  let custom = self.ctx.custom;
  custom.labels = [];
  if (custom.timeUnit == 'hour') {
    for (let i = custom.current.startTs; i <= custom.current.endTs; i += 3600000) {
      custom.labels.push(moment(i).format('HH:00'));
    }
  }
  if (custom.timeUnit == 'week') {
    for (let i = custom.current.startTs; i <= custom.current.endTs; i += 86400000) {
      custom.labels.push(moment(i).format('ddd'));
    }
  }
  if (custom.timeUnit == 'day') {
    for (let i = custom.current.startTs; i <= custom.current.endTs; i += 86400000) {
      custom.labels.push(moment(i).format('DD'));
    }
  }
  if (custom.timeUnit == 'month') {
    let i = custom.current.startTs;
    while (i <= custom.current.endTs) {
      custom.labels.push(moment(i).format('MM'));
      let interval = moment(i).endOf('month').date() * 86400000;
      i += interval;
    }
  }
}

function createDataset() {
  getLabel();

  self.ctx.custom.chartData = {
    labels: self.ctx.custom.labels,
    datasets: [
      {
        label: t('thingplus.page.entire-view.past-usage'),
        data: getDefaultData(),
        backgroundColor: '#FEC599',
        borderColor: 'rgba(0,0,0,0)',
        hoverBackgroundColor: '#FEC599',
        fill: true,
        borderWidth: 1,
        categoryPercentage: 0.5,
        barPercentage: 0.75,
      },
      {
        label: t('thingplus.page.entire-view.current-usage'),
        data: getDefaultData(),
        backgroundColor: '#FF7001',
        borderColor: '#FF7001',
        hoverBackgroundColor: '#FF7001',
        fill: true,
        borderWidth: 1,
        categoryPercentage: 0.5,
        barPercentage: 0.75,
      },
    ],
  };
}

// 차트생성
function createChart() {
  let setting = self.ctx.settings;
  let fontSize = _.round((self.ctx.width / setting.widget.originWidth) * setting.font.size, 2);

  // legend와 chart 사이 간격 주기
  Chart.Legend.prototype.afterFit = function () {
    this.height = this.height + 20;
  };

  let ctx = $('.chart', self.ctx.custom.$widget);
  self.ctx.custom.chart = new Chart(ctx, {
    type: 'bar',
    data: self.ctx.custom.chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      hover: {
        mode: 'point',
      },
      legend: {
        display: true,
        position: 'top',
        align: 'start',
        labels: {
          fontColor: setting.font.color,
          fontFamily: setting.font.family,
          fontStyle: setting.font.style,
          fontSize: fontSize,
          padding: 10,
          boxWidth: 8,
          usePointStyle: true,
        },
      },
      scales: {
        xAxes: [
          {
            display: setting.axis.x.view,
            type: 'category',
            scaleLabel: {
              display: setting.axis.x.nameView,
              labelString: setting.axis.x.name,
              fontColor: setting.font.color,
              fontFamily: setting.font.family,
              fontStyle: setting.font.style,
              fontSize: fontSize,
            },
            ticks: {
              fontColor: setting.font.color,
              fontFamily: setting.font.family,
              fontStyle: setting.font.style,
              fontSize: fontSize,
            },
            gridLines: {
              display: false,
            },
          },
        ],
        yAxes: [
          {
            display: setting.axis.y.view,
            scaleLabel: {
              display: setting.axis.y.nameView,
              labelString: setting.axis.y.name,
              fontColor: setting.font.color,
              fontFamily: setting.font.family,
              fontStyle: setting.font.style,
              fontSize: fontSize,
            },
            ticks: {
              suggestedMin: setting.axis.y.suggestedMin,
              suggestedMax: setting.axis.y.suggestedMax,
              min: setting.axis.y.min,
              max: setting.axis.y.max,
              fontColor: setting.font.color,
              fontFamily: setting.font.family,
              fontStyle: setting.font.style,
              fontSize: fontSize,
            },
          },
        ],
      },
    },
  });
}

function getDefaultData() {
  let defaultData = [];
  for (let i in self.ctx.custom.labels) {
    defaultData.push({
      x: self.ctx.custom.labels[i],
      y: null,
    });
  }
  return defaultData;
}

function insertData(datas) {
  let custom = self.ctx.custom;

  if (custom.timeUnit == 'month') {
    let acc = [];
    for (let i in datas) {
      acc.push([]);
      for (let j = 0; j < 12; j++) {
        acc[i].push([]);
      }
    }
    for (let i in datas) {
      for (let j in datas[i]['TP_energy_kwh']) {
        acc[i][moment(datas[i]['TP_energy_kwh'][j].ts).month()].push(datas[i]['TP_energy_kwh'][j].value);
      }
    }
    for (let i = 0; i < acc.length; i++) {
      for (let j = 0; j < acc[i].length; j++) {
        let sum = 0;
        for (let k in acc[i][j]) {
          sum += Number(acc[i][j][k]);
        }
        let targetIndex = custom.labels.indexOf((j + 1 >= 10 ? '' : '0') + (j + 1));
        if (targetIndex !== -1 && acc[i][j].length > 0) {
          custom.chart.data.datasets[i].data[targetIndex].y = sum;
        }
      }
    }
  } else {
    let timeFormat = 'HH:00';
    if (custom.timeUnit == 'hour') {
      timeFormat = 'HH:00';
    }
    if (custom.timeUnit == 'week') {
      timeFormat = 'ddd';
    }
    if (custom.timeUnit == 'day') {
      timeFormat = 'DD';
    }
    for (let i in datas) {
      for (let j in datas[i]['TP_energy_kwh']) {
        let targetIndex = custom.labels.indexOf(moment(datas[i]['TP_energy_kwh'][j].ts).format(timeFormat));
        if (targetIndex !== -1) {
          custom.chart.data.datasets[i].data[targetIndex].y = _.round(datas[i]['TP_energy_kwh'][j].value, 1);
        }
      }
    }
  }
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
