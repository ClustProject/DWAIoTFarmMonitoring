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
    parseData();
    insertData();
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

function addTooltip($target, bed, level, label, portion, number, color) {
  let $content = $(`
  <div style="display: flex; flex-direction: column">
    <div style="display: flex; align-items: center; justify-content: flex-start; padding-bottom: 11px">
      <div style="font-size: 12px; color: white; font-weight: 500;">${bed}</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="display: flex; align-items: center; justify-content: start;">
        <hr style="width:10px; border: 2px solid ${color};height:0; margin:0; margin-right:8px; display:inline-block;"/>
        <div style="font-size: 12px; color: #b9bdc4; display:inline-block;">${level}</div>
      </div>
      <div style="font-size: 12px; color: white">${portion} %</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 5px">
      <div style="font-size: 12px; color: #b9bdc4; margin-left:18px;">${label}</div>
      <div style="font-size: 12px; color: white">${number} 개</div>
    </div>
  </div>`);

  $content.css({
    width: '207px',
    height: '120px',
    backgroundColor: '#2a2f33',
    padding: `12px`,
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
  if (self.ctx.data.length > 0) {
    let custom = self.ctx.custom;

    custom.fruitDataObj = {
      sum: {
        class0: 0,
        class1: 0,
        class2: 0,
        class3: 0,
        class4: 0,
        class5: 0,
        class6: 0,
      },
      B1: {
        class0: 0,
        class1: 0,
        class2: 0,
        class3: 0,
        class4: 0,
        class5: 0,
        class6: 0,
      },
      B2: {
        class0: 0,
        class1: 0,
        class2: 0,
        class3: 0,
        class4: 0,
        class5: 0,
        class6: 0,
      },
      B3: {
        class0: 0,
        class1: 0,
        class2: 0,
        class3: 0,
        class4: 0,
        class5: 0,
        class6: 0,
      },
      B4: {
        class0: 0,
        class1: 0,
        class2: 0,
        class3: 0,
        class4: 0,
        class5: 0,
        class6: 0,
      },
    };

    for (let i = 0; i < self.ctx.data.length; i++) {
      if (self.ctx.data[i].data != null) {
        custom.fruitDataObj['sum'][self.ctx.data[i].dataKey.name] += Math.floor(self.ctx.data[i].data[0][1]);

        for (let key in custom.fruitDataObj) {
          if (self.ctx.data[i].datasource.name.includes(key)) {
            custom.fruitDataObj[key][self.ctx.data[i].dataKey.name] += Math.floor(self.ctx.data[i].data[0][1]);
          }
        }
      }
    }
  }
}

function insertData() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  self.ctx.custom.fruitDataObj;

  let fruitSum = 0;
  for (let key in custom.fruitDataObj.sum) {
    fruitSum += custom.fruitDataObj.sum[key];
  }

  $scope.fruitSum = fruitSum;

  $scope.level0Sum = custom.fruitDataObj.sum.class0;
  $scope.level1Sum = custom.fruitDataObj.sum.class1;
  $scope.level2Sum = custom.fruitDataObj.sum.class2;
  $scope.level3Sum = custom.fruitDataObj.sum.class3;
  $scope.level4Sum = custom.fruitDataObj.sum.class4;
  $scope.level5Sum = custom.fruitDataObj.sum.class5;
  $scope.level6Sum = custom.fruitDataObj.sum.class6;

  $scope.level0SumLine = (custom.fruitDataObj.sum.class0 / fruitSum) * 100 + '%';
  $scope.level1SumLine = (custom.fruitDataObj.sum.class1 / fruitSum) * 100 + '%';
  $scope.level2SumLine = (custom.fruitDataObj.sum.class2 / fruitSum) * 100 + '%';
  $scope.level3SumLine = (custom.fruitDataObj.sum.class3 / fruitSum) * 100 + '%';
  $scope.level4SumLine = (custom.fruitDataObj.sum.class4 / fruitSum) * 100 + '%';
  $scope.level5SumLine = (custom.fruitDataObj.sum.class5 / fruitSum) * 100 + '%';
  $scope.level6SumLine = (custom.fruitDataObj.sum.class6 / fruitSum) * 100 + '%';

  $('.line-container', self.ctx.$container).each(function (i, obj) {
    $('.level-line', obj).each(function (j, x) {
      let key = '';
      let sum = 0;
      let bedLabel = '';
      switch (i) {
        case 0:
          key = 'sum';
          bedLabel = '평균';
          break;
        case 1:
          key = 'B1';
          bedLabel = 'Bed1';
          break;
        case 2:
          key = 'B2';
          bedLabel = 'Bed2';
          break;
        case 3:
          key = 'B3';
          bedLabel = 'Bed3';
          break;
        case 4:
          key = 'B4';
          bedLabel = 'Bed4';
          break;
        default:
          break;
      }

      for (let key2 in custom.fruitDataObj[key]) {
        sum += custom.fruitDataObj[key][key2];
      }

      let color = 'white';
      switch (j) {
        case 0:
          color = '#9bc7d9';
          break;
        case 1:
          color = '#b9d3de';
          break;
        case 2:
          color = '#d8dee1';
          break;
        case 3:
          color = '#ebc6ca';
          break;
        case 4:
          color = '#f09ca0';
          break;
        case 5:
          color = '#e55e63';
          break;
        case 6:
          color = '#bd353a';
          break;
        default:
          break;
      }

      $(this).css('width', (custom.fruitDataObj[key]['class' + j] / sum) * 100 + '%');

      addTooltip(
        $(this),
        bedLabel,
        j + '단계',
        '딸기 열매 수',
        Math.floor((custom.fruitDataObj[key]['class' + j] / sum) * 100),
        custom.fruitDataObj[key]['class' + j],
        color
      );
    });
  });
}
