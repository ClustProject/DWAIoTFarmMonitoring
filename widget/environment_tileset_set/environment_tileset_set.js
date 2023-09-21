self.onInit = function () {
  defineVariables(); // 변수 정의

  // apply backgound img
  // applyBackgroundImg();

  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  $scope.toggleStatus = function (idx) {
    let key;
    let active;
    let label;

    switch (idx) {
      case 0:
        key = 'Irrigator';
        active = custom.controlData.irrigator;
        label = '배양';

        break;
      case 1:
        key = 'Heater';
        active = custom.controlData.heater;
        label = '히터';
        break;
      case 2:
        key = 'Ventilator';
        active = custom.controlData.ventilator;
        label = '환풍기';
        break;
      default:
        break;
    }

    let entityId;
    for (let i in self.ctx.datasources) {
      if (self.ctx.datasources[i].name == 'Controller') {
        entityId = self.ctx.datasources[i].entity.id;
      }
    }

    let actionDescriptor = self.ctx.actionsApi.getActionDescriptors('controlDevice');
    self.ctx.actionsApi.handleWidgetAction('', actionDescriptor[0], entityId, '', { key, active, label }, '');
  };

  $scope.togglePrediction = function () {
    let key = 'Predictor';
    let active = custom.controlData.predictor;
    let label = '환경 예측';

    let entityId;
    for (let i in self.ctx.datasources) {
      if (self.ctx.datasources[i].name == 'Controller') {
        entityId = self.ctx.datasources[i].entity.id;
      }
    }

    let actionDescriptor = self.ctx.actionsApi.getActionDescriptors('controlPredictor');
    self.ctx.actionsApi.handleWidgetAction('', actionDescriptor[0], entityId, '', { key, active, label }, '');
  };

  self.onResize();

  // 로딩바 레이어 제거
  self.ctx.custom.$progressSection.css('display', 'none');
};

self.onDataUpdated = function () {
  // data 들어오고 시작하려고 할 때
  if (self.ctx.defaultSubscription.loadingData == false) {
    if (self.ctx.datasources[0].type != 'function') {
      // make point data
      makeDataToJSON();

      insertData();

      // make entity point
      createPoints();
      // create heatmap
    }
  }
};

self.onResize = function () {
  let custom = self.ctx.custom;

  // 위젯 사이즈
  self.ctx.custom.widgetSize = self.ctx.settings.title.widgetSize;

  let fontSize = _.round((self.ctx.width / self.ctx.custom.widgetSize) * 10, 2);
  self.ctx.custom.$widget.css('font-size', `${fontSize}px`);

  // Header와 Footer Height를 제외한 영역을 Main의 Height로 설정
  let headerHeight = custom.$widgetHeader.outerHeight(true);
  custom.$widgetContent.css('height', `calc(100% - ${headerHeight}px)`);
};

self.actionSources = function () {
  return {
    customButton: {
      name: 'custom-action',
      multiple: true,
    },
    markerClick: {
      name: 'marker-click',
      multiple: true,
    },
    controlDevice: {
      name: 'Control Device',
      multiple: true,
    },
    controlPredictor: {
      name: 'Control Predictor',
      multiple: true,
    },
  };
};

// self.ctx.custom과 self.ctx.$scope에 변수 정의
function defineVariables() {
  let custom = (self.ctx.custom = {});
  let $container = self.ctx.$container;

  // 태그 정의
  custom.$widget = $('#widget', $container);
  custom.$widgetHeader = $('.widget-header', $container);
  custom.$widgetIcon = $('.widget-icon', $container);
  custom.$widgetTitle = $('.widget-title', $container);
  custom.$widgetAction = $('.widget-action', $container);
  custom.$widgetContent = $('.widget-content', $container);
  custom.$progressSection = $('.progress-section', $container);

  custom.$mapBox = $('.map-box', $container);
}

function makeDataToJSON() {
  if (self.ctx.datasources[0].type != 'function') {
    let targetObj = {};

    self.ctx.custom.controlData = {};

    for (let i in self.ctx.data) {
      if (self.ctx.data[i].datasource.aliasName != 'Controller') {
        // 첫 데이터여서 선언되지 않았을 경우 {} 선언해주기
        if (targetObj[self.ctx.data[i].datasource.name] == undefined) {
          targetObj[self.ctx.data[i].datasource.name] = {};
        }

        if (self.ctx.data[i].data[0][1] !== '') {
          targetObj[self.ctx.data[i].datasource.name][self.ctx.data[i].dataKey.label] =
            self.ctx.data[i].data[0][1] +
            (self.ctx.data[i].dataKey.units !== undefined && self.ctx.data[i].dataKey.units !== null
              ? ' ' + self.ctx.data[i].dataKey.units
              : '');
        }
        // 액션에 사용할 entity 정보 추가
        if (targetObj[self.ctx.data[i].datasource.name].entity == undefined) {
          // entity = {id : {entityType:"", id: ""}, label: "", name: ""}
          targetObj[self.ctx.data[i].datasource.name].entity = self.ctx.data[i].datasource.entity;
        }
      } else {
        let keyName = self.ctx.data[i].dataKey.name;

        switch (keyName) {
          case 'Irrigator':
            self.ctx.custom.controlData.irrigator = self.ctx.data[i].data[0][1];
            break;
          case 'Heater':
            self.ctx.custom.controlData.heater = self.ctx.data[i].data[0][1];
            break;
          case 'Ventilator':
            self.ctx.custom.controlData.ventilator = self.ctx.data[i].data[0][1];
            break;
          case 'PredictedTemperature':
            self.ctx.custom.controlData.predictedTemperature = self.ctx.data[i].data[0][1];
            break;
          case 'Predictor':
            self.ctx.custom.controlData.predictor = self.ctx.data[i].data[0][1];
            break;

          default:
            break;
        }
      }

      self.ctx.custom.jsonData = [];
      for (let i in targetObj) {
        self.ctx.custom.jsonData.push(targetObj[i]);
      }
    }
  } else {
    self.ctx.custom.jsonData = [
      {
        entity: { label: 'A' },
        x: 0.25,
        y: 0.25,
        value: 50,
      },
      { entity: { label: 'B' }, x: 0.55, y: 0.75, value: 70 },
      { entity: { label: 'C' }, x: 0.45, y: 0.25, value: 90 },
      { entity: { label: 'D' }, x: 0.75, y: 0.75, value: 100 },
      {
        entity: { label: 'E' },
        x: 0.35,
        y: 0.35,
        value: 50,
      },
      { entity: { label: 'F' }, x: 0.45, y: 0.75, value: 70 },
      { entity: { label: 'G' }, x: 0.45, y: 0.15, value: 90 },
      { entity: { label: 'H' }, x: 0.65, y: 0.85, value: 100 },
    ];
  }
}

function insertData() {
  let custom = self.ctx.custom;
  let $scope = self.ctx.$scope;

  $('.control-container .card-box', self.ctx.$container).each(function (index, content) {
    switch (index) {
      case 0:
        if (custom.controlData.irrigator == 'true') {
          $(this).addClass('active');
          $scope.irrigator = 'ON';
        } else {
          $(this).removeClass('active');
          $scope.irrigator = 'OFF';
        }
        break;
      case 1:
        if (custom.controlData.heater == 'true') {
          $(this).addClass('active');
          $scope.heater = 'ON';
        } else {
          $(this).removeClass('active');
          $scope.heater = 'OFF';
        }
        break;
      case 2:
        if (custom.controlData.ventilator == 'true') {
          $(this).addClass('active');
          $scope.ventilator = 'ON';
        } else {
          $(this).removeClass('active');
          $scope.ventilator = 'OFF';
        }
        break;
      default:
        break;
    }
  });

  if (custom.controlData.predictor == 'true') {
    $('.forcast-title-box', self.ctx.$container).addClass('active');
    $scope.predictStatus = true;
  } else {
    $('.forcast-title-box', self.ctx.$container).removeClass('active');
    $scope.predictStatus = false;
  }

  $scope.predictedTemperature = custom.controlData.predictedTemperature;
}

function createPoints() {
  // point DOM 삭제
  $('.point', self.ctx.$container).detach();

  let iconBoxList = $('.map-box .icon-box', self.ctx.$container);

  for (let i in self.ctx.custom.jsonData) {
    let targetData = self.ctx.custom.jsonData[i];
    // 동적 point 생성
    let $point = $(`<div class="point tooltip"></div>`);

    let label = targetData.entity.label;

    if (!label.includes('토양')) {
      addSvg($point, label);

      // 텍스트 라벨 CSS
      $point.css({
        fontSize: '1em',
        fontWeight: 'bold',
        color: 'black',
        backgroundColor: 'transparent',
        width: '5em',
        height: '5em',
      });
      $point.css('transform', `translate(-50%,-50%)`);
      $point.css({
        bottom: targetData.y * 100 + '%',
        left: targetData.x * 100 + '%',
      });
      // $point.click(function () {
      //   // label Click event
      //   let actions = self.ctx.actionsApi.getActionDescriptors('markerClick');
      //   self.ctx.actionsApi.handleWidgetAction(
      //     '',
      //     actions[0],
      //     targetData.entity.id,
      //     targetData.entity.name,
      //     null,
      //     targetData.entity.label
      //   );
      // });
      createTooltip($point, self.ctx.custom.jsonData[i]);

      self.ctx.custom.$mapBox.append($point);
    } else {
      iconBoxList.each(function (index, content) {
        if (self.ctx.custom.jsonData[i].entity.label.includes(index + 1)) {
          createTooltip($(this), self.ctx.custom.jsonData[i]);
        }
      });
    }
  }
}

function addSvg($point, label) {
  if (label.includes('퀀텀')) {
    let $svg = $(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <g id="그룹_164509" data-name="그룹 164509" transform="translate(-1119 -576)">
          <g id="사각형_148805" data-name="사각형 148805" transform="translate(1119 576)" fill="#fff" stroke="#986ded" stroke-width="1">
            <rect width="60" height="60" rx="2" stroke="none"/>
            <rect x="0.5" y="0.5" width="59" height="59" rx="1.5" fill="none"/>
          </g>
          <path id="fluorescent_FILL0_wght200_GRAD0_opsz40" d="M10.208,23.25v-6.5H29.792v6.5ZM19.333,7.958V4.083H20.75V7.958Zm11.209,4.25-1-.958,2.416-2.458,1,1ZM19.333,35.75V31.917H20.75V35.75Zm12.625-4.583-2.416-2.459,1-1,2.416,2.459ZM9.458,12.208,7.042,9.792l1-1,2.416,2.458ZM8.042,31.167l-1-1,2.416-2.459,1,1Zm3.583-9.334h16.75V18.125H11.625Zm0,0v0Z" transform="translate(1128.958 585.916)" fill="#986ded"/>
        </g>
      </svg>
      `);

    $point.append($svg);
  } else if (label.includes('조도')) {
    let $svg = $(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <g id="그룹_164510" data-name="그룹 164510" transform="translate(-1119 -446)">
          <g id="사각형_148804" data-name="사각형 148804" transform="translate(1119 446)" fill="#fff" stroke="#fbbd08" stroke-width="1">
            <rect width="60" height="60" rx="2" stroke="none"/>
            <rect x="0.5" y="0.5" width="59" height="59" rx="1.5" fill="none"/>
          </g>
          <path id="wb_incandescent_FILL0_wght200_GRAD0_opsz40" d="M19.292,35.833v-4.5h1.416v4.5ZM4.167,20.708V19.292h4.5v1.416Zm27.166,0V19.292h4.5v1.416Zm-1,11.209L27.167,28.75l1-1.042,3.166,3.167Zm-20.666,0-1-1.042,3.166-3.167,1,1.042ZM20,26.458A6.4,6.4,0,0,1,13.542,20a6.266,6.266,0,0,1,.9-3.312,6.6,6.6,0,0,1,2.437-2.355v-6.5h6.25v6.5a6.6,6.6,0,0,1,2.437,2.355,6.266,6.266,0,0,1,.9,3.312A6.4,6.4,0,0,1,20,26.458ZM18.292,13.875a3.688,3.688,0,0,1,.833-.229,6.108,6.108,0,0,1,1.75,0,3.688,3.688,0,0,1,.833.229V9.25H18.292ZM20,25.042A5.053,5.053,0,0,0,25.042,20,5.053,5.053,0,0,0,20,14.958,5.053,5.053,0,0,0,14.958,20,5.053,5.053,0,0,0,20,25.042ZM20,20Z" transform="translate(1128.833 454.167)" fill="#fbbd08"/>
        </g>
      </svg>
      `);

    $point.append($svg);
  } else if (label.includes('온습도')) {
    let $svg = $(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <g id="그룹_164511" data-name="그룹 164511" transform="translate(-1119 -316)">
          <g id="사각형_148806" data-name="사각형 148806" transform="translate(1119 316)" fill="#fff" stroke="#3e88fa" stroke-width="1">
            <rect width="60" height="60" rx="2" stroke="none"/>
            <rect x="0.5" y="0.5" width="59" height="59" rx="1.5" fill="none"/>
          </g>
          <path id="cool_to_dry_FILL0_wght200_GRAD0_opsz40" d="M18.458,32.375a11.421,11.421,0,0,1-7.208-3.729,10.879,10.879,0,0,1-2.917-7.6,10.513,10.513,0,0,1,.938-4.48,14.206,14.206,0,0,1,2.479-3.687L20,4.792l8.25,8.125a12.751,12.751,0,0,1,2.1,2.9A10.913,10.913,0,0,1,31.5,19.25H30.125a9.541,9.541,0,0,0-1-2.833A10.672,10.672,0,0,0,27.292,14L20,6.833,12.708,14A9.5,9.5,0,0,0,9.75,21.042a9.547,9.547,0,0,0,2.5,6.583,10.037,10.037,0,0,0,6.208,3.333ZM19.917,18.875Zm2.541,6.958-.541-1.208a11.453,11.453,0,0,1,1.916-.75,7.1,7.1,0,0,1,2-.292,7.424,7.424,0,0,1,1.771.209,12.569,12.569,0,0,1,1.688.541q.833.334,1.666.6a5.515,5.515,0,0,0,1.709.27,6.278,6.278,0,0,0,1.771-.25,8.894,8.894,0,0,0,1.645-.666l.542,1.25a8.876,8.876,0,0,1-1.958.75,8.219,8.219,0,0,1-2,.25,7.424,7.424,0,0,1-1.771-.209,14.53,14.53,0,0,1-1.729-.541q-.792-.334-1.625-.6a5.5,5.5,0,0,0-1.709-.271,5.627,5.627,0,0,0-1.75.271A13.573,13.573,0,0,0,22.458,25.833Zm0,4.5-.541-1.208a8.778,8.778,0,0,1,1.916-.771,7.617,7.617,0,0,1,2-.271,7.424,7.424,0,0,1,1.771.209,12.569,12.569,0,0,1,1.688.541q.833.334,1.666.6a5.515,5.515,0,0,0,1.709.27,6.278,6.278,0,0,0,1.771-.25,8.894,8.894,0,0,0,1.645-.666l.542,1.25a11.516,11.516,0,0,1-1.958.729,7.617,7.617,0,0,1-2,.271,7.424,7.424,0,0,1-1.771-.209,14.53,14.53,0,0,1-1.729-.541q-.792-.334-1.625-.6a5.5,5.5,0,0,0-1.709-.271,5.627,5.627,0,0,0-1.75.271A13.573,13.573,0,0,0,22.458,30.333Zm0,4.5-.541-1.208a9.609,9.609,0,0,1,1.916-.792,7.127,7.127,0,0,1,2-.291,6.808,6.808,0,0,1,1.771.229,15.086,15.086,0,0,1,1.688.562q.833.334,1.666.584a5.92,5.92,0,0,0,1.709.25,6.278,6.278,0,0,0,1.771-.25,11.138,11.138,0,0,0,1.645-.625l.542,1.208a9.719,9.719,0,0,1-1.958.771,7.617,7.617,0,0,1-2,.271,7.424,7.424,0,0,1-1.771-.209,11,11,0,0,1-1.729-.583q-.792-.292-1.625-.562a5.5,5.5,0,0,0-1.709-.271,6.062,6.062,0,0,0-1.75.25A9.138,9.138,0,0,0,22.458,34.833Z" transform="translate(1126.666 326.208)" fill="#3e88fa"/>
        </g>
      </svg>
      `);

    $point.append($svg);
  } else if (label.includes('온도')) {
    let $svg = $(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <g id="그룹_164513" data-name="그룹 164513" transform="translate(-1018 -427)">
          <g id="사각형_148810" data-name="사각형 148810" transform="translate(1018 427)" fill="#f4fcfc" stroke="#00a3a3" stroke-width="1">
            <rect width="60" height="60" rx="2" stroke="none"/>
            <rect x="0.5" y="0.5" width="59" height="59" rx="1.5" fill="none"/>
          </g>
          <path id="layers_FILL0_wght200_GRAD0_opsz40" d="M20,31.083,7.708,21.542l1.125-.917L20,29.292l11.167-8.667,1.125.917Zm0-5.75L7.708,15.792,20,6.25l12.292,9.542ZM20,15.542Zm0,8,10-7.75L20,8.083,10,15.792Z" transform="translate(1028.292 438.75)" fill="#00a3a3"/>
        </g>
      </svg>
      `);

    $point.append($svg);
  } else if (label.includes('토양')) {
    let $svg = $(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <g id="그룹_164516" data-name="그룹 164516" transform="translate(-860 -297)">
          <g id="사각형_148810" data-name="사각형 148810" transform="translate(860 297)" fill="#fff" stroke="#ccc" stroke-width="1">
            <rect width="60" height="60" rx="2" stroke="none"/>
            <rect x="0.5" y="0.5" width="59" height="59" rx="1.5" fill="none"/>
          </g>
          <path id="layers_FILL0_wght200_GRAD0_opsz40" d="M20,31.083,7.708,21.542l1.125-.917L20,29.292l11.167-8.667,1.125.917Zm0-5.75L7.708,15.792,20,6.25l12.292,9.542ZM20,15.542Zm0,8,10-7.75L20,8.083,10,15.792Z" transform="translate(870.292 308.75)" fill="#999"/>
        </g>
      </svg>
      `);

    $point.append($svg);
  } else if (label.includes('일사량')) {
    let $svg = $(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <g id="그룹_164517" data-name="그룹 164517" transform="translate(-769 -316)">
          <g id="사각형_148810" data-name="사각형 148810" transform="translate(769 316)" fill="#fff" stroke="#db2828" stroke-width="1">
            <rect width="60" height="60" rx="2" stroke="none"/>
            <rect x="0.5" y="0.5" width="59" height="59" rx="1.5" fill="none"/>
          </g>
          <path id="light_mode_FILL0_wght200_GRAD0_opsz40" d="M20,25.25a5.089,5.089,0,0,0,3.708-1.521A5.035,5.035,0,0,0,25.25,20a5.089,5.089,0,0,0-1.521-3.708A5.035,5.035,0,0,0,20,14.75a5.089,5.089,0,0,0-3.708,1.521A5.035,5.035,0,0,0,14.75,20a5.089,5.089,0,0,0,1.521,3.708A5.035,5.035,0,0,0,20,25.25Zm0,1.417A6.617,6.617,0,0,1,13.333,20,6.617,6.617,0,0,1,20,13.333,6.617,6.617,0,0,1,26.667,20,6.617,6.617,0,0,1,20,26.667ZM3.208,20.708a.708.708,0,0,1,0-1.416H7.625a.708.708,0,0,1,0,1.416Zm29.167,0a.708.708,0,0,1,0-1.416h4.417a.708.708,0,0,1,0,1.416ZM20,8.333a.71.71,0,0,1-.708-.708V3.208a.708.708,0,0,1,1.416,0V7.625A.71.71,0,0,1,20,8.333ZM20,37.5a.71.71,0,0,1-.708-.708V32.375a.708.708,0,0,1,1.416,0v4.417A.71.71,0,0,1,20,37.5ZM10.792,11.708l-2.584-2.5A.658.658,0,0,1,8,8.729a.806.806,0,0,1,.208-.521.737.737,0,0,1,.521-.25.612.612,0,0,1,.479.25L11.75,10.75a.7.7,0,0,1,0,1,.658.658,0,0,1-.479.208A.612.612,0,0,1,10.792,11.708Zm20,20.084L28.25,29.25a.7.7,0,0,1,0-1,.477.477,0,0,1,.458-.229.7.7,0,0,1,.5.271l2.584,2.5a.658.658,0,0,1,.208.479.806.806,0,0,1-.208.521.737.737,0,0,1-.521.25A.612.612,0,0,1,30.792,31.792ZM28.25,11.75a.551.551,0,0,1-.229-.479.685.685,0,0,1,.271-.479l2.5-2.584A.658.658,0,0,1,31.271,8a.806.806,0,0,1,.521.208.737.737,0,0,1,.25.521.612.612,0,0,1-.25.479L29.25,11.75a.658.658,0,0,1-.479.208A.806.806,0,0,1,28.25,11.75ZM8.208,31.792a.737.737,0,0,1-.25-.521.612.612,0,0,1,.25-.479L10.75,28.25a.625.625,0,0,1,1,0,.507.507,0,0,1,.188.458.761.761,0,0,1-.23.5l-2.5,2.584a.612.612,0,0,1-.479.25A.737.737,0,0,1,8.208,31.792ZM20,20Z" transform="translate(779.5 326.5)" fill="#db2828"/>
        </g>
      </svg>
      `);

    $point.append($svg);
  }
}

function createTooltip(targetPoint, targetData) {
  // 하나의 키 값만을 보여주는 툴팁을 만들 경우

  let content = $('<div></div>');

  for (let i in targetData) {
    if (i === 'entity') {
      let label = $(`<div> ${targetData.entity.label} </div>`);

      label.css({
        fontSize: '12px',
        color: 'white',
        fontWeight: 500,
        paddingBottom: '11px',
      });

      content.prepend(label);
    }

    if (i !== 'entity' && i !== 'x' && i !== 'y' && targetData[i] !== '') {
      let keyBox = $('<div></div>');
      let keyName = $(`<div> ${i + ' : '} </div>`);
      let keyValue = $(`<div> ${targetData[i]} </div>`);

      keyBox.css({
        width: '100%',
        paddingTop: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      });

      keyName.css({
        fontSize: '12px',
        fontWeight: 'normal',
        color: '#b9bdc4',
      });

      keyValue.css({
        fontSize: '12px',
        fontWeight: 'normal',
        color: 'white',
      });

      keyBox.append(keyName);
      keyBox.append(keyValue);
      content.append(keyBox);
    }
  }

  content.css({
    color: 'white',
    backgroundColor: '#2a2f33',

    width: '207px',
    height: '160px',
    padding: '12px',
    // borderRadius: '0.1em',
    display: 'flex',
    flexDirection: 'column',

    // boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.1)',
  });

  // let tooltipArrow = $('<div></div>');

  // tooltipArrow.css({
  //   content: '',
  //   position: 'absolute',
  //   top: '100%',
  //   left: '50%',
  //   marginLeft: '-10px',
  //   marginTop: '-15px', // -15해야 딱 맞게 붙음 기존의 tooltipster box padding으로 인한 예외 처리
  //   borderWidth: '10px',
  //   borderStyle: 'solid',
  //   borderColor: 'white transparent transparent transparent',
  // });

  // content.append(tooltipArrow);

  $(document).ready(function () {
    targetPoint.tooltipster({
      content: content,
      contentAsHTML: true,
      theme: 'tooltipster-transparent',
      trigger: 'hover',
      functionPosition: function (instance, helper, position) {
        position.coord.left += 0;
        position.coord.top += 10;
        return position;
      },
    });
  });
}

function applyBackgroundImg() {
  // 배경 이미지
  self.ctx.custom.$mapBox.css('background-image', `url(${self.ctx.settings.heatmap.backgroundImage})`);
}
