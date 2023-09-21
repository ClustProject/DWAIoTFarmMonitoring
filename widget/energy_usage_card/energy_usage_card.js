const TIME_LIST = [
  {
    current: {
      startTs: moment().startOf('day').valueOf(),
      endTs: moment().endOf('day').valueOf(),
    },
    previous: {
      startTs: moment().startOf('day').subtract(1, 'days').valueOf(),
      endTs: moment().endOf('day').subtract(1, 'days').valueOf(),
    },
    interval: 60 * 60 * 1000,
  },
  // 참고 - 일요일이 한 주의 시작 기준
  {
    current: {
      startTs: moment().startOf('week').valueOf(),
      endTs: moment().endOf('week').valueOf(),
    },
    previous: {
      startTs: moment().subtract(7, 'days').startOf('week').valueOf(),

      endTs: moment().subtract(7, 'days').endOf('week').valueOf(),
    },
    interval: 24 * 60 * 60 * 1000,
  },
  {
    current: {
      startTs: moment().startOf('month').valueOf(),
      endTs: moment().endOf('month').valueOf(),
    },
    previous: {
      startTs: moment().subtract(1, 'months').startOf('month').valueOf(),
      endTs: moment().subtract(1, 'months').endOf('month').valueOf(),
    },
    interval: 24 * 60 * 60 * 1000,
  },
];

self.onInit = function () {
  defineVariables();
  setTitle();

  self.onResize();
};

self.onDestroy = function () {};

self.onDataUpdated = function () {
  if (self.ctx.datasources[0].type !== 'function') {
    if (self.ctx.defaultSubscription.loadingData == false) {
      // 업데이트 시간 갱신
      if (
        self.ctx.data[0].data.length > 0 &&
        self.ctx.data[0].data[0].length > 0 &&
        self.ctx.data[0].data[0][0] != undefined &&
        self.ctx.data[0].data[0][0] != '' &&
        self.ctx.data[0].data[0][0] != 0
      ) {
        self.ctx.custom.$latestTime.html(moment(self.ctx.data[0].data[0][0]).format(t('thingplus.time-format.ymdhm')));
      }

      // 처음 또는 일자가 달려진 경우에만 API 요청하기
      if (self.ctx.custom.originDay !== moment().format('DD')) {
        self.ctx.custom.originDay = moment().format('DD');
        loadData();
      } else {
        addData();
      }
    }
  }
};

self.onResize = function () {
  let custom = self.ctx.custom;
  // 위젯 전체 크기 조절
  const originWidth = self.ctx.settings.widget.originWidth;
  let widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  custom.$widget.css('font-size', `${widgetFontSize}px`);

  // Header와 Footer Height를 제외한 영역을 Main의 Height로 설정
  let headerHeight = custom.$widgetHeader.outerHeight(true);
  custom.$widgetContent.css('height', `calc(100% - ${headerHeight}px)`);
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

  custom.$latestTime = $('.latest-time', $container);

  self.ctx.custom.originDay;
  self.ctx.custom.mainData = [];
  self.ctx.custom.targetData = {};
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(t(self.ctx.widget.config.title));
  self.ctx.custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);
}

// 데이터 불러오기
function loadData() {
  let custom = self.ctx.custom;
  let entityId = self.ctx.datasources[0].entity.id;
  let keys = ['TP_energy_kwh'];
  let promises = [];
  for (let i in TIME_LIST) {
    promises.push(
      self.ctx.http.get(
        `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
          TIME_LIST[i].interval
        }&agg=SUM&keys=${keys.join(',')}&startTs=${TIME_LIST[i].previous.startTs}&endTs=${TIME_LIST[i].previous.endTs}`
      )
    );
    promises.push(
      self.ctx.http.get(
        `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/values/timeseries?interval=${
          TIME_LIST[i].interval
        }&agg=SUM&keys=${keys.join(',')}&startTs=${TIME_LIST[i].current.startTs}&endTs=${TIME_LIST[i].current.endTs}`
      )
    );
  }

  self.ctx.rxjs.forkJoin(promises).subscribe(datas => {
    compressData(datas);
    makeVisualData();
    applyData();
  });
}

function compressData(datas) {
  // array = [전일 값, 금일 , 전주 값, 금주 값, 전월 값, 금월 값]
  let array = [];
  for (let i in datas) {
    let sum = 0;
    for (let j in datas[i]['TP_energy_kwh']) {
      sum += +datas[i]['TP_energy_kwh'][j].value;
    }
    array.push(sum);
  }

  // API 결과 값이 비어있더라도 해당 index에 0값이 들어가기에 index 위치나 array 길이에 변화는 없다.
  self.ctx.custom.mainData = array;
}

function makeVisualData() {
  self.ctx.custom.targetData = {
    day: {
      value: 0,
      contrastRate: '↑ 0%',
      spendMore: true,
    },
    week: {
      value: 0,
      contrastRate: '↑ 0%',
      spendMore: true,
    },
    month: {
      value: 0,
      contrastRate: '↑ 0%',
      spendMore: true,
    },
  };

  // 전일 금일
  self.ctx.custom.targetData.day.value = self.ctx.custom.mainData[0].toFixed(1);

  self.ctx.custom.targetData.day.contrastRate =
    (self.ctx.custom.mainData[1] > self.ctx.custom.mainData[0] ? '↑' : '↓') +
    ' ' +
    (self.ctx.custom.mainData[0] === 0
      ? 0
      : (Math.abs(self.ctx.custom.mainData[1] - self.ctx.custom.mainData[0]) / self.ctx.custom.mainData[0]).toFixed(
          1
        )) +
    '%';
  self.ctx.custom.targetData.day.spendMore = self.ctx.custom.mainData[1] > self.ctx.custom.mainData[0] ? true : false;

  // 전주 금주
  self.ctx.custom.targetData.week.value = self.ctx.custom.mainData[2].toFixed(1);

  self.ctx.custom.targetData.week.contrastRate =
    (self.ctx.custom.mainData[3] > self.ctx.custom.mainData[2] ? '↑' : '↓') +
    ' ' +
    (self.ctx.custom.mainData[2] === 0
      ? 0
      : (Math.abs(self.ctx.custom.mainData[3] - self.ctx.custom.mainData[2]) / self.ctx.custom.mainData[2]).toFixed(
          1
        )) +
    '%';
  self.ctx.custom.targetData.week.spendMore = self.ctx.custom.mainData[3] > self.ctx.custom.mainData[2] ? true : false;

  // 전월 금월
  self.ctx.custom.targetData.month.value = self.ctx.custom.mainData[4].toFixed(1);
  self.ctx.custom.targetData.month.contrastRate =
    (self.ctx.custom.mainData[5] > self.ctx.custom.mainData[4] ? '↑' : '↓') +
    ' ' +
    (self.ctx.custom.mainData[4] === 0
      ? 0
      : (Math.abs(self.ctx.custom.mainData[5] - self.ctx.custom.mainData[4]) / self.ctx.custom.mainData[4]).toFixed(
          1
        )) +
    '%';
  self.ctx.custom.targetData.month.spendMore = self.ctx.custom.mainData[5] > self.ctx.custom.mainData[4] ? true : false;
}

function applyData() {
  $('.day-value', self.ctx.$container).html(self.ctx.custom.targetData.day.value);
  $('.day-contrast-rate', self.ctx.$container).html(self.ctx.custom.targetData.day.contrastRate);
  $('.day-contrast-rate', self.ctx.$container).css(
    'color',
    self.ctx.custom.targetData.day.spendMore ? '#01bfa6' : '#fe3d00'
  );

  $('.week-value', self.ctx.$container).html(self.ctx.custom.targetData.week.value);
  $('.week-contrast-rate', self.ctx.$container).html(self.ctx.custom.targetData.week.contrastRate);
  $('.week-contrast-rate', self.ctx.$container).css(
    'color',
    self.ctx.custom.targetData.week.spendMore ? '#01bfa6' : '#fe3d00'
  );

  $('.month-value', self.ctx.$container).html(self.ctx.custom.targetData.month.value);
  $('.month-contrast-rate', self.ctx.$container).html(self.ctx.custom.targetData.month.contrastRate);
  $('.month-contrast-rate', self.ctx.$container).css(
    'color',
    self.ctx.custom.targetData.month.spendMore ? '#01bfa6' : '#fe3d00'
  );
}

function addData() {
  if (
    self.ctx.data[0].data.length > 0 &&
    self.ctx.data[0].data[0].length > 0 &&
    self.ctx.data[0].data[0][1] != undefined &&
    self.ctx.data[0].data[0][1] != '' &&
    self.ctx.data[0].data[0][1] != 0
  ) {
    let newData = self.ctx.data[0].data[0][1];

    self.ctx.custom.mainData[1] += newData;
    self.ctx.custom.mainData[3] += newData;
    self.ctx.custom.mainData[5] += newData;

    makeVisualData();
    applyData();
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
