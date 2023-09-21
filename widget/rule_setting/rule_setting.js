self.onInit = function () {
  defineVariables();
  setTitle();
  createTooltip();
  makeTooltip();

  // makeTooltip();

  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  $scope.toggleStatus = function (idx) {
    let key;
    let value;

    switch (idx) {
      case 0:
        key = 'EnvControl';
        value = !$scope.envControl;
        break;
      case 1:
        key = 'PredictControl';
        value = !$scope.predictControl;
        break;
      default:
        break;
    }

    saveAttributes().subscribe(() => {
      self.ctx.updateAliases();
    });
    function saveAttributes() {
      let entityId = self.ctx.datasources[0].entity.id;
      let attributesArray = [{ key, value }];
      if (attributesArray.length > 0) {
        return self.ctx.attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', attributesArray);
      } else {
        return self.ctx.rxjs.of([]);
      }
    }
  };

  $scope.changeValue = function () {
    saveAttributes().subscribe(() => {
      self.ctx.updateAliases();
    });
    function saveAttributes() {
      let entityId = self.ctx.datasources[0].entity.id;
      let attributesArray = [
        { key: 'minTemp', value: $scope.selectedMinTemperature },
        { key: 'maxTemp', value: $scope.selectedMaxTemperature },
        { key: 'predictedMinTemp', value: $scope.selectedMinPredict },
        { key: 'predictedMaxTemp', value: $scope.selectedMaxPredict },
        { key: 'minCoordinate', value: $scope.selectedMinCoordinate },
        { key: 'maxCoordinate', value: $scope.selectedMaxCoordinate },
      ];

      if (attributesArray.length > 0) {
        return self.ctx.attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', attributesArray);
      } else {
        return self.ctx.rxjs.of([]);
      }
    }
  };

  self.onResize();
};

self.onDestroy = function () {};

self.onDataUpdated = function () {
  if (self.ctx.datasources[0].type != 'function') {
    parseData();
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
  let $scope = self.ctx.$scope;

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

  $scope.temperatureList = [];
  for (let i = -15; i < 31; i++) {
    $scope.temperatureList.push({ value: i, label: i + '℃' });
  }
  $scope.selectedMinTemperature = '';
  $scope.selectedMaxTemperature = '';

  $scope.predictList = [];
  for (let i = -15; i < 31; i++) {
    $scope.predictList.push({ value: i, label: i + '℃' });
  }
  $scope.selectedMinPredict = '';
  $scope.selectedMaxPredict = '';

  $scope.coordinateList = [];
  for (let i = -15; i < 31; i++) {
    $scope.coordinateList.push({ value: i, label: (i > 0 ? '+' : '') + i + '℃' });
  }
  $scope.selectedMinCoordinate = '';
  $scope.selectedMaxCoordinate = '';
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
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

function makeTooltip() {
  $('.title-box .material-icons-outlined', self.ctx.$container).each(function (i, obj) {
    addTooltip($(this), '변경된 기준 온도에 맞추어 제어');
  });
}

function addTooltip($target, label) {
  let $content = $(`
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 9px 12px">
      <material-icons class="material-icons-outlined" style="width: 16px; height: 16px; font-size: 16px; color: #b9bdc4; margin-right: 10px;">info</material-icons>
      <div style="font-size: 12px; color: white">${label}</div>
    </div>`);

  $content.css({
    // width: '160px',
    // height: '32px',
    backgroundColor: '#2a2f33',
    // padding: `16px`,
  });

  $target.tooltipster({
    content: $content,
    interactive: true,
    theme: 'tooltipster-transparent',
    trigger: 'hover',
    delay: 0,
  });
}

function parseData() {
  let $scope = self.ctx.$scope;

  for (let i in self.ctx.data) {
    let key = self.ctx.data[i].dataKey.name;
    let value = self.ctx.data[i].data[0][1];

    switch (key) {
      case 'EnvControl':
        $scope.envControl = value == 'true' ? true : false;
        if ($scope.envControl) $scope.active0 = 'active';
        break;
      case 'PredictControl':
        $scope.predictControl = value == 'true' ? true : false;
        if ($scope.predictControl) $scope.active1 = 'active';
        break;
      case 'minTemp':
        $scope.selectedMinTemperature = value;
        break;
      case 'maxTemp':
        $scope.selectedMaxTemperature = value;
        break;
      case 'predictedMinTemp':
        $scope.selectedMinPredict = value;
        break;
      case 'predictedMaxTemp':
        $scope.selectedMaxPredict = value;
        break;
      case 'minCoordinate':
        $scope.selectedMinCoordinate = value;
        break;
      case 'maxCoordinate':
        $scope.selectedMaxCoordinate = value;
        break;

      default:
        break;
    }
  }
}
