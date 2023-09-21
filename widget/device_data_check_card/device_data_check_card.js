self.onInit = function () {
  defineVariables();
  // setTitle();

  makeKeySection();

  self.onResize();
};

self.onDataUpdated = function () {
  parseData();
  setTitle();
  updateKeySection();
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

  custom.$deviceCheckBox = $('.device-check-box', $container);
  custom.$deviceCheckOn = $('.check-on', custom.$deviceCheckBox);
  custom.$deviceCheckOff = $('.check-off', custom.$deviceCheckBox);
  custom.$keySection = $('.key-section', $container);

  self.ctx.custom.mainData = [];

  // Define Normal Variables
  let now = moment().valueOf();

  // 대시보드 시작 시간 기록
  custom.initTime = now;

  // 체크할 key 및 단위 세팅
  custom.keyList = self.ctx.settings.data.keyList.split(',');
}

// Create Widget Title
function setTitle() {
  self.ctx.custom.$widgetTitle.html(self.ctx.custom.deviceType + ' ' + self.ctx.datasources[0].name);
  self.ctx.custom.$widgetTitle.css(self.ctx.widget.config.titleStyle);
}

function makeKeySection() {
  let custom = self.ctx.custom;

  custom.$keySection;

  for (let i in custom.keyList) {
    let $keyBox = $(`<div class="key-box ${custom.keyList[i] + 'Box'}"></div>`);
    let $key = $(`<div class="key">${custom.keyList[i]}</div>`);
    let $value = $(`<div class="value"></div>`);
    let $ts = $(`<div class="ts">값이 없음</div>`);
    let $keyCheckBox = $(`<div class="key-check-box">
        <div class="check-on">On</div>
        <div class="check-off">Off</div>
      </div>`);

    $keyBox.append($key);
    $keyBox.append($value);
    $keyBox.append($ts);
    $keyBox.append($keyCheckBox);

    custom.$keySection.append($keyBox);
  }
}

function parseData() {
  if (self.ctx.datasources[0].type !== 'function') {
    self.ctx.custom.mainData = [];

    for (let i in self.ctx.data) {
      if (self.ctx.data[i].dataKey.name != 'type') {
        // subscription 데이터 넣기
        let data = {};
        data.key = self.ctx.data[i].dataKey.name;
        data.value = self.ctx.data[i].data[0][1];
        data.ts = self.ctx.data[i].data[0][0];
        data.unit = self.ctx.data[i].dataKey.units;
        // data.ts = moment(self.ctx.data[i].data[0][0]).format('M/DD HH:mm:ss');
        self.ctx.custom.mainData.push(data);
      } else {
        self.ctx.custom.deviceType = self.ctx.data[i].data[0][1];
      }
    }
  }
}

function updateKeySection() {
  let custom = self.ctx.custom;

  if (custom.mainData.length > 0) {
    let offCount = 0;
    for (let i in custom.mainData) {
      let $targetKeyBox = $(`.${custom.mainData[i].key + 'Box'}`, self.ctx.$container);
      let $value = $(`.value`, $targetKeyBox);
      let $ts = $(`.ts`, $targetKeyBox);
      let $checkOn = $(`.check-on`, $targetKeyBox);
      let $checkOff = $(`.check-off`, $targetKeyBox);

      $value.html(
        custom.mainData[i].value + ' ' + (custom.mainData[i].unit != undefined ? custom.mainData[i].unit : '')
      );
      $ts.html(moment(custom.mainData[i].ts).format('M/DD HH:mm:ss'));

      if (custom.mainData[i].ts > custom.initTime) {
        $checkOn.css({
          opacity: '1',
        });
        $checkOff.css({
          opacity: '0.1',
        });
      } else {
        $checkOn.css({
          opacity: '0.1',
        });
        $checkOff.css({
          opacity: '1',
        });
        offCount++;
      }
    }

    if (offCount == 0) {
      custom.$deviceCheckOn.css({
        opacity: '1',
      });
      custom.$deviceCheckOff.css({
        opacity: '0.1',
      });
    } else {
      custom.$deviceCheckOn.css({
        opacity: '0.1',
      });
      custom.$deviceCheckOff.css({
        opacity: '1',
      });
    }
  }
}
