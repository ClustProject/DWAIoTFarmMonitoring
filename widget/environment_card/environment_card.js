self.onInit = function () {
  defineVariables();
  setTitle();
  insertHeaderAction();
  getDashboardParameter();

  self.onResize();
};

self.onDestroy = function () {};

self.onDataUpdated = function () {
  if (self.ctx.datasources[0].type != 'function') {
    if (self.ctx.data.length > 0) {
      parseData();
      insertData();
    }
  }
};

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

function parseData() {
  let custom = self.ctx.custom;

  custom.dataObj = {
    co2: {
      sum: 0,
      count: 0,
      value: 0,
    },
    pressure: {
      sum: 0,
      count: 0,
      value: 0,
    },
    temperature: {
      sum: 0,
      count: 0,
      value: 0,
    },
    humidity: {
      sum: 0,
      count: 0,
      value: 0,
    },
    illumination: {
      sum: 0,
      count: 0,
      value: 0,
    },
    soilTemperature: {
      sum: 0,
      count: 0,
      value: 0,
    },
    soilHumidity: {
      sum: 0,
      count: 0,
      value: 0,
    },
    soilEC: {
      sum: 0,
      count: 0,
      value: 0,
    },
  };
  for (let i in self.ctx.data) {
    let keyLabel = self.ctx.data[i].dataKey.label;
    custom.dataObj[keyLabel].sum += self.ctx.data[i].data[0][1];
    custom.dataObj[keyLabel].count++;
  }

  for (let key in custom.dataObj) {
    custom.dataObj[key].value = (custom.dataObj[key].sum / custom.dataObj[key].count).toFixed(1);
  }
}

function insertData() {
  let $scope = self.ctx.$scope;
  let custom = self.ctx.custom;

  $scope.co2 = custom.dataObj.co2.value;
  $scope.pressure = custom.dataObj.pressure.value;
  $scope.temperature = custom.dataObj.temperature.value;
  $scope.humidity = custom.dataObj.humidity.value;
  $scope.illumination = custom.dataObj.illumination.value;
  $scope.soilTemperature = custom.dataObj.soilTemperature.value;
  $scope.soilHumidity = custom.dataObj.soilHumidity.value;
  $scope.soilEC = custom.dataObj.soilEC.value;
}
