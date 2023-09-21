const ENTITY_TYPE = ['device', 'customer', 'tenant'];
self.onInit = async function () {
  defineVariables();
  setTitle();

  self.onMobileModeChanged();
  self.onResize();

  if (self.ctx.datasources.length > 0 && self.ctx.datasources[0].type != 'function') {
    applyEvent();
    getDashboardParameter();
  }

  // 이거 없어도 mat-select에 잘 나옴 -> 있어야함
  self.ctx.detectChanges();
};

self.onResize = function () {
  let custom = self.ctx.custom;
  // 위젯 전체 크기 조절
  const originWidth = self.ctx.settings.widget.originWidth;
  let widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  custom.$widget.css('font-size', `${widgetFontSize}px`);
};

self.typeParameters = function () {
  return {
    maxDatasources: -1,
    maxDataKeys: -1,
    dataKeysOptional: true,
  };
};
self.onMobileModeChanged = function () {
  let custom = self.ctx.custom;

  if (self.ctx.isMobile) {
    custom.$widget.addClass('tp-mobile');
  } else {
    custom.$widget.removeClass('tp-mobile');
  }
};
self.actionSources = function () {
  return {
    openSelector: {
      name: 'Open Selector',
      multiple: true,
    },
  };
};

function defineVariables() {
  let custom = (self.ctx.custom = {});
  let $container = self.ctx.$container;
  let $scope = self.ctx.$scope;

  // Initialize tags
  custom.$widget = $('#widget', $container);
  custom.$widgetTitle = $('.widget-title', $container);
  custom.$widgetContent = $('.widget-content', $container);

  // Initialize scope
  $scope.customerList = [
    {
      name: '',
      label: '온실 전체',
    },
    {
      name: 'B1',
      label: 'Bed1',
    },
    {
      name: 'B2',
      label: 'Bed2',
    },
    {
      name: 'B3',
      label: 'Bed3',
    },
    {
      name: 'B4',
      label: 'Bed4',
    },
  ];
  $scope.selectedCustomer = '';

  // 변수 정의
  custom.relations = {};
  custom.hierarchyInfo = {};
  custom.maxDepth = 0;

  let now = moment().valueOf();
  custom.startTs = moment('2023-04-01').startOf('day').valueOf();
  custom.endTs = moment('2023-04-15').endOf('day').valueOf();
  $scope.startDate = moment(custom.startTs).toDate();
  $scope.endDate = moment(custom.endTs).toDate();
  $scope.viewStartDate = moment(custom.startTs).format('YYYY-MM-DD');
  $scope.viewEndDate = moment(custom.endTs).format('YYYY-MM-DD');

  $scope.nowDate = moment('2023-05-12').endOf('day').toDate();

  // 로딩 바
  custom.$progressBox = $('.progress-box', $container);
}

// self.ctx.$widgetTitle의 내용과 스타일 변경
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
}

// self.ctx.$scope에 HTML과 연동되는 메서드 추가
function applyEvent() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  $scope.setStartDate = function ($event) {
    $scope.startDate = $event;
    custom.startTs = moment($event).startOf('day').valueOf();
    $scope.viewStartDate = moment($event).format('YYYY-MM-DD');
  };
  $scope.setEndDate = function ($event) {
    $scope.endDate = $event;
    custom.endTs = moment($event).endOf('day').valueOf();
    $scope.viewEndDate = moment($event).format('YYYY-MM-DD');
  };

  $scope.search = function () {
    let customerEntity;

    for (let i in $scope.customerList) {
      // 만약 '건물 전체'를 선택한 경우 상위 entity를 바인딩하여 dashboardState가 비는 것을 방지
      if ($scope.customerList[i].name == $scope.selectedCustomer) {
        customerEntity = $scope.customerList[i];
      }
    }

    let param = {
      customer: customerEntity,
      startTs: custom.startTs,
      endTs: custom.endTs,
    };

    self.ctx.stateController.resetState();
    self.ctx.stateController.updateState('default', param, false);
    self.ctx.updateAliases();
  };
}

function getDashboardParameter() {
  let { custom, $scope } = self.ctx;
  if (custom.isSample) return {};
  custom.dashboardParams = self.ctx.stateController.getStateParams();
  if (custom.dashboardParams) {
    if (custom.dashboardParams.customer) {
      $scope.selectedCustomer = custom.dashboardParams.customer.name;
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

function sorting(entityList, sortKey) {
  // sorting
  entityList.sort((a, b) => {
    if (a[sortKey] == b[sortKey]) {
      return 0;
    } else if (b[sortKey] < a[sortKey]) {
      return 1;
    } else if (a[sortKey] < b[sortKey]) {
      return -1;
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
