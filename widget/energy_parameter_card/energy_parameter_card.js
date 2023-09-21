const KEY_OBJ = {
  f1_volt1: { className: 'vr-rms', unit: 'V' },
  f1_volt2: { className: 'vs-rms', unit: 'V' },
  f1_volt3: { className: 'vt-rms', unit: 'V' },
  f1_amp1: { className: 'ir-rms', unit: 'A' },
  f1_amp2: { className: 'is-rms', unit: 'A' },
  f1_amp3: { className: 'it-rms', unit: 'A' },
  unbal: { className: 'volt-unbal', unit: '%' },
  f1_unbal: { className: 'curr_unbal', unit: '%' },
  f1_PF: { className: 'factor', unit: '%' },
  frequency: { className: 'frequency', unit: 'Hz' },
  f1_watt: { className: 'active-watt', unit: 'W' },
  f1_var: { className: 'reactive-watt', unit: 'W' },
  f1_kwh_imp: { className: 'total-watt', unit: 'KWH' },
  f1_thd: { className: 'thd', unit: '%' },
};

self.onInit = function () {
  defineVariables();
  setTitle();

  self.onResize();
};

self.onDestroy = function () {};

self.onDataUpdated = function () {
  if (self.ctx.datasources[0].type !== 'function') {
    if (self.ctx.defaultSubscription.loadingData == false) {
      for (let i in self.ctx.data) {
        if (self.ctx.data[i].dataKey !== undefined && self.ctx.data[i].data.length > 0) {
          $('.' + KEY_OBJ[self.ctx.data[i].dataKey.name].className, self.ctx.$container).html(
            self.ctx.data[i].data[0][1] + ' ' + KEY_OBJ[self.ctx.data[i].dataKey.name].unit
          );
        }
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
  custom.$widgetContent = $('.widget-content', $container);
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(t(self.ctx.widget.config.title));
  self.ctx.custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);
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
