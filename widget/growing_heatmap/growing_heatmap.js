self.onInit = async function () {
  defineVariables();
  setTitle();
  insertHeaderAction();
  createTooltip();
  getDashboardParameter();

  makeTooltip();

  // await getLineData();
  // parseData();

  self.ctx.$scope.detailView = function (bed, position) {
    let actionDescriptor = self.ctx.actionsApi.getActionDescriptors('detailView');
    self.ctx.actionsApi.handleWidgetAction('', actionDescriptor[0], '', '', { bed, position }, '');
  };

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
    detailView: {
      name: 'Detail View',
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

function makeTooltip() {
  $('.bed-container .right-section .material-icons-outlined', self.ctx.$container).each(function (i, obj) {
    addTooltip($(this), '단계별 클러스터 수');
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

    custom.positionObj = {
      B1: {
        1: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        2: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        3: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        4: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        5: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        6: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        7: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        8: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        9: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        10: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        11: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        12: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        13: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        14: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        15: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        16: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        17: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        18: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        19: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        20: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        21: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        22: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        23: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        24: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        25: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        26: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        27: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        28: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        29: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        30: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
      },
      B2: {
        1: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        2: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        3: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        4: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        5: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        6: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        7: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        8: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        9: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        10: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        11: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        12: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        13: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        14: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        15: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        16: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        17: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        18: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        19: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        20: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        21: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        22: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        23: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        24: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        25: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        26: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        27: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        28: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        29: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        30: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
      },
      B3: {
        1: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        2: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        3: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        4: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        5: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        6: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        7: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        8: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        9: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        10: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        11: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        12: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        13: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        14: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        15: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        16: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        17: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        18: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        19: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        20: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        21: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        22: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        23: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        24: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        25: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        26: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        27: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        28: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        29: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        30: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
      },
      B4: {
        1: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        2: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        3: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        4: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        5: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        6: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        7: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        8: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        9: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        10: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        11: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        12: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        13: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        14: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        15: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        16: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        17: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        18: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        19: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        20: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        21: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        22: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        23: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        24: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        25: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        26: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        27: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        28: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        29: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
        30: {
          0: 0,
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
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

        for (let key in custom.positionObj) {
          if (self.ctx.data[i].datasource.name.includes(key)) {
            let pIndex = self.ctx.data[i].datasource.name.indexOf('P');
            let position = self.ctx.data[i].datasource.name.substring(pIndex + 1);
            let label = self.ctx.data[i].dataKey.label.substring(self.ctx.data[i].dataKey.label.length - 1);

            custom.positionObj[key][position][label] += Math.floor(self.ctx.data[i].data[0][1]);
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

  $scope.level0B1 = custom.fruitDataObj.B1.class0;
  $scope.level1B1 = custom.fruitDataObj.B1.class1;
  $scope.level2B1 = custom.fruitDataObj.B1.class2;
  $scope.level3B1 = custom.fruitDataObj.B1.class3;
  $scope.level4B1 = custom.fruitDataObj.B1.class4;
  $scope.level5B1 = custom.fruitDataObj.B1.class5;
  $scope.level6B1 = custom.fruitDataObj.B1.class6;

  $scope.level0B2 = custom.fruitDataObj.B2.class0;
  $scope.level1B2 = custom.fruitDataObj.B2.class1;
  $scope.level2B2 = custom.fruitDataObj.B2.class2;
  $scope.level3B2 = custom.fruitDataObj.B2.class3;
  $scope.level4B2 = custom.fruitDataObj.B2.class4;
  $scope.level5B2 = custom.fruitDataObj.B2.class5;
  $scope.level6B2 = custom.fruitDataObj.B2.class6;

  $scope.level0B3 = custom.fruitDataObj.B3.class0;
  $scope.level1B3 = custom.fruitDataObj.B3.class1;
  $scope.level2B3 = custom.fruitDataObj.B3.class2;
  $scope.level3B3 = custom.fruitDataObj.B3.class3;
  $scope.level4B3 = custom.fruitDataObj.B3.class4;
  $scope.level5B3 = custom.fruitDataObj.B3.class5;
  $scope.level6B3 = custom.fruitDataObj.B3.class6;

  $scope.level0B4 = custom.fruitDataObj.B4.class0;
  $scope.level1B4 = custom.fruitDataObj.B4.class1;
  $scope.level2B4 = custom.fruitDataObj.B4.class2;
  $scope.level3B4 = custom.fruitDataObj.B4.class3;
  $scope.level4B4 = custom.fruitDataObj.B4.class4;
  $scope.level5B4 = custom.fruitDataObj.B4.class5;
  $scope.level6B4 = custom.fruitDataObj.B4.class6;

  $('.heatmap-container', self.ctx.$container).each(function (i, obj) {
    $('.heatmap', obj).each(function (j, x) {
      let position = custom.positionObj['B' + (i + 1)][j + 1];
      let count = 0;
      let sum = 0;

      for (let key in position) {
        count += position[key];
        sum += key * position[key];
      }

      let grade;
      if (count == 0) {
        grade = -1;
      } else {
        grade = Math.round(sum / count);
      }

      let color = 'white';
      switch (grade) {
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
          color = '#5e83bf'; // '없음' 상태
          break;
      }

      $(this).css('backgroundColor', color);
    });
  });
}
