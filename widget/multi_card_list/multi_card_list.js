self.onInit = function () {
  defineVariables();
  setTitle();

  self.onResize();
};

self.onDestroy = function () {};

self.onDataUpdated = function () {
  parseData();
};

self.onResize = function () {
  let custom = self.ctx.custom;
  // 위젯 전체 크기 조절
  const originWidth = self.ctx.settings.widget.originWidth;
  let widgetFontSize = _.round((self.ctx.width / originWidth) * 10, 2);
  custom.$widget.css('font-size', `${widgetFontSize}px`);

  // Header와 Footer Height를 제외한 영역을 Main의 Height로 설정
  let headerHeight = custom.$widgetHeader.outerHeight(true);
  let footerHeight = custom.$widgetFooter.outerHeight(true);
  custom.$widgetContent.css('height', `calc(100% - ${headerHeight + footerHeight}px)`);
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
  let $scope = self.ctx.$scope;
  let $container = self.ctx.$container;

  // Define Tags
  custom.$widget = $('#widget', $container);
  custom.$widgetHeader = $('.widget-header', $container);
  custom.$widgetTitle = $('.widget-title', $container);
  custom.$widgetAction = $('.widget-action', $container);
  custom.$widgetContent = $('.widget-content', $container);
  custom.$widgetFooter = $('.widget-footer', $container);

  $scope.co2_1 = 0;
  $scope.co2_2 = 0;
  $scope.co2_3 = 0;
  $scope.pressure1 = 0;
  $scope.pressure2 = 0;
  $scope.pressure3 = 0;
  $scope.temperature1 = 0;
  $scope.temperature2 = 0;
  $scope.temperature3 = 0;
  $scope.humidity1 = 0;
  $scope.humidity2 = 0;
  $scope.humidity3 = 0;

  $scope.ch1 = 0;
  $scope.ch2_1 = 0;
  $scope.ch2_2 = 0;
  $scope.illumination1 = 0;
  $scope.illumination2 = 0;
  $scope.stackedElectric = 0;
  $scope.soil_temperature1 = 0;
  $scope.soil_temperature2 = 0;
  $scope.soil_temperature3 = 0;
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.widget.config.title);
  self.ctx.custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);
}

function parseData() {
  if (self.ctx.datasources[0].type !== 'function') {
    let $scope = self.ctx.$scope;

    for (let i in self.ctx.data) {
      let targetLabel = self.ctx.data[i].datasource.entityLabel;
      let targetIndex = targetLabel.charAt(targetLabel.length - 1);
      let targetKey = self.ctx.data[i].dataKey.name.toLowerCase();
      let targetValue = self.ctx.data[i].data[0][1];
      let targetUnit = self.ctx.data[i].dataKey.units !== undefined ? ' ' + self.ctx.data[i].dataKey.units : '';
      if (targetLabel.includes('온습도/CO2')) {
        if (targetValue !== '') {
          if (targetKey === 'co2') {
            $scope[targetKey + '_' + targetIndex] = targetValue + targetUnit;
          } else {
            $scope[targetKey + targetIndex] = targetValue + targetUnit;
          }
        }
      } else if (targetLabel.includes('조도')) {
        if (targetValue !== '') {
          $scope[targetKey + targetIndex] = targetValue + targetUnit;
        }
      } else if (targetLabel.includes('온도')) {
        if (targetValue !== '') {
          $scope['soil_' + targetKey + targetIndex] = targetValue + targetUnit;
        }
      } else if (targetLabel.includes('일사량')) {
        if (targetValue !== '') {
          $scope[targetKey] = targetValue + targetUnit;
        }
      } else if (targetLabel.includes('퀀텀')) {
        if (targetValue !== '') {
          $scope[targetKey + '_' + targetIndex] = targetValue + targetUnit;
        }
      } else if (targetLabel.includes('Gems3500')) {
        if (targetValue !== '') {
          $scope['stackedElectric'] = targetValue + targetUnit;
        }
      }
    }

    self.ctx.detectChanges();
  }
}
