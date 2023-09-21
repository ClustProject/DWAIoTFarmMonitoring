const ENTITY_TYPE = ['device', 'asset', 'customer'];
self.onInit = async function () {
  defineVariables();
  setTitle();

  self.onMobileModeChanged();
  self.onResize();

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
    await getDeviceInfo();
    addSelectorOption();
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
      id: { id: '', entityType: '' },
      name: 'Bed 전체',
      label: 'Bed 전체',
    },
    // {
    //   name: 'B1',
    //   label: 'Bed1',
    // },
    // {
    //   name: 'B2',
    //   label: 'Bed2',
    // },
    // {
    //   name: 'B3',
    //   label: 'Bed3',
    // },
    // {
    //   name: 'B4',
    //   label: 'Bed4',
    // },
  ];
  $scope.deviceList = [
    { id: { id: '', entityType: '' }, name: 'Position 전체', label: 'Position 전체' },
    // { name: 'P1', label: 'P-1' },
    // { name: 'P2', label: 'P-2' },
    // { name: 'P3', label: 'P-3' },
    // { name: 'P4', label: 'P-4' },
    // { name: 'P5', label: 'P-5' },
    // { name: 'P6', label: 'P-6' },
    // { name: 'P7', label: 'P-7' },
    // { name: 'P8', label: 'P-8' },
    // { name: 'P9', label: 'P-9' },
    // { name: 'P10', label: 'P-10' },
    // { name: 'P11', label: 'P-11' },
    // { name: 'P12', label: 'P-12' },
    // { name: 'P13', label: 'P-13' },
    // { name: 'P14', label: 'P-14' },
    // { name: 'P15', label: 'P-15' },
    // { name: 'P16', label: 'P-16' },
    // { name: 'P17', label: 'P-17' },
    // { name: 'P18', label: 'P-18' },
    // { name: 'P19', label: 'P-19' },
    // { name: 'P20', label: 'P-20' },
    // { name: 'P21', label: 'P-21' },
    // { name: 'P22', label: 'P-22' },
    // { name: 'P23', label: 'P-23' },
    // { name: 'P24', label: 'P-24' },
    // { name: 'P25', label: 'P-25' },
    // { name: 'P26', label: 'P-26' },
    // { name: 'P27', label: 'P-27' },
    // { name: 'P28', label: 'P-28' },
    // { name: 'P29', label: 'P-29' },
    // { name: 'P30', label: 'P-30' },
  ];
  $scope.selectedCustomer = '';
  $scope.selectedDevice = '';

  // 변수 정의
  custom.relations = {};
  custom.hierarchyInfo = {};
  custom.maxDepth = 0;

  let now = moment().valueOf();
  custom.startTs = moment('2023-02-01').startOf('day').valueOf();
  custom.endTs = moment('2023-02-28').endOf('day').valueOf();
  $scope.startDate = moment(custom.startTs).toDate();
  $scope.endDate = moment(custom.endTs).toDate();
  $scope.viewStartDate = moment(custom.startTs).format('YYYY-MM-DD');
  $scope.viewEndDate = moment(custom.endTs).format('YYYY-MM-DD');
  $scope.nowDate = moment('2023-03-01').endOf('day').toDate();

  // 로딩 바
  custom.$progressBox = $('.progress-box', $container);
}

// self.ctx.$widgetTitle의 내용과 스타일 변경
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
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

// 각 고객사에 할당된 장비들을 불러와 레이블을 hierarchyInfo.deviceList에 기록
function getDeviceInfo() {
  let custom = self.ctx.custom;
  let observables = [];
  for (let i in custom.hierarchyInfo.customerList) {
    let customerId = custom.hierarchyInfo.customerList[i].id.id;
    observables.push(self.ctx.http.get(`/api/customer/${customerId}/deviceInfos?pageSize=50000&page=0`));
  }
  return new Promise(resolve => {
    self.ctx.rxjs.forkJoin(observables).subscribe(devices => {
      // 각 커스터머별 API 요청
      for (let i in devices) {
        // 특정 커스터머 아래 각 디바이스
        for (let j in devices[i].data) {
          if (devices[i].data[j].deviceProfileName == 'CLUST') {
            custom.relations[devices[i].data[j].id.id].label = devices[i].data[j].label;
            // 만일 Label이 공백일 경우 Name으로 대체
            if (_.isNil(devices[i].data[j].label) || devices[i].data[j].label.trim() == '') {
              custom.relations[devices[i].data[j].id.id].label = devices[i].data[j].name;
            }
          }
        }
      }
      resolve();
    });
  });
}

function addSelectorOption() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  $scope.customerList = _.cloneDeep(custom.hierarchyInfo.assetList);

  sorting($scope.customerList, 'name');

  let customerObj = {};

  customerObj.id = { id: '', entityType: '' };
  customerObj.label = 'Bed 전체';
  customerObj.name = 'Bed 전체';

  $scope.customerList.unshift(customerObj);

  // $scope.deviceList = _.cloneDeep(custom.hierarchyInfo.deviceList);

  $scope.deviceList = [];

  sorting($scope.deviceList, 'label');

  let deviceObj = {};

  deviceObj.id = { id: '', entityType: '' };
  deviceObj.label = 'Position 전체';
  deviceObj.name = 'Position 전체';

  $scope.deviceList.unshift(deviceObj);
}

// self.ctx.$scope에 HTML과 연동되는 메서드 추가
function applyEvent() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  $scope.changeCustomer = function ($event) {
    if ($event.value === '') {
      $scope.deviceList = [{ id: { id: '', entityType: '' }, name: 'Position 전체', label: 'Position 전체' }];
      $scope.selectedDevice = '';
    } else {
      $scope.deviceList = _.cloneDeep(custom.relations[$event.value].child);
      sorting($scope.deviceList, 'label');
      $scope.deviceList.unshift({ id: { id: '', entityType: '' }, name: 'Position 전체', label: 'Position 전체' });
    }
  };

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
    let deviceEntity;

    if (moment(custom.startTs).month() != moment(custom.endTs).month()) {
      window.alert('같은 달만 조회가 가능합니다.');
      return;
    }

    for (let i in $scope.customerList) {
      // 만약 '건물 전체'를 선택한 경우 상위 entity를 바인딩하여 dashboardState가 비는 것을 방지
      if ($scope.selectedCustomer == '') {
        customerEntity = {
          id: { id: '', entityType: '' },
          name: 'Bed 전체',
          label: 'Bed 전체',
        };
      } else if ($scope.customerList[i].id.id == $scope.selectedCustomer) {
        customerEntity = $scope.customerList[i];
      }
    }
    for (let i in $scope.deviceList) {
      // 만약 '건물 전체'를 선택한 경우 상위 entity를 바인딩하여 dashboardState가 비는 것을 방지
      if ($scope.selectedDevice == '') {
        deviceEntity = { id: { id: '', entityType: '' }, name: 'Position 전체', label: 'Position 전체' };
      } else if ($scope.deviceList[i].id.id == $scope.selectedDevice) {
        deviceEntity = $scope.deviceList[i];
      }
    }

    let param = {
      entityId: deviceEntity.id,
      entityName: deviceEntity.name,
      entityLabel: deviceEntity.label,
      customer: {
        entityId: customerEntity.id,
        entityName: customerEntity.name,
        entityLabel: customerEntity.label,
      },
      device: {
        entityId: deviceEntity.id,
        entityName: deviceEntity.name,
        entityLabel: deviceEntity.label,
      },
      startTs: custom.startTs,
      endTs: custom.endTs,
    };

    self.ctx.stateController.resetState();
    self.ctx.stateController.updateState('default', param, false);
    self.ctx.updateAliases();
  };

  $scope.openSelector = function () {
    let actions = self.ctx.actionsApi.getActionDescriptors('openSelector');

    if (actions.length > 0) {
      self.ctx.actionsApi.handleWidgetAction(null, actions[0], null, null, null, null);
    }
  };
}

function getDashboardParameter() {
  let { custom, $scope } = self.ctx;
  if (custom.isSample) return {};
  custom.dashboardParams = self.ctx.stateController.getStateParams();
  if (custom.dashboardParams) {
    if (custom.dashboardParams.customer) {
      $scope.selectedCustomer = custom.dashboardParams.customer.entityId.id;

      if ($scope.selectedCustomer === '') {
        $scope.deviceList = [{ id: { id: '', entityType: '' }, name: 'Position 전체', label: 'Position 전체' }];
      } else {
        $scope.deviceList = _.cloneDeep(custom.relations[$scope.selectedCustomer].child);
        sorting($scope.deviceList, 'label');
        $scope.deviceList.unshift({ id: { id: '', entityType: '' }, name: 'Position 전체', label: 'Position 전체' });
      }
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
