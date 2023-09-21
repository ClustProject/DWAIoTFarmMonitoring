let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));

openEditDeviceDialog();

function openEditDeviceDialog() {
  customDialog.customDialog(htmlTemplate, EditDeviceDialogController).subscribe();
}

function EditDeviceDialogController(instance) {
  let vm = instance;

  vm.entityLabel = entityLabel;
  vm.attributes = {};
  vm.attributeKeys = ['customerName', 'label', 'name', 'productionStandard'];

  vm.editEntityFormGroup = vm.fb.group({
    customerName: ['', [vm.validators.required]],
    label: ['', [vm.validators.required]],
    name: ['', [vm.validators.required]],
    productionStandard: ['']
  });

  vm.productionStandardLength = additionalParams.productionStandard.length;

  setData();

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    vm.editEntityFormGroup.markAsPristine();
    widgetContext.rxjs.forkJoin([saveAttributes(entityId), saveTelemetry(entityId)]).subscribe(() => {
      window.alert(
        '수정된 목표량은 오늘부터 반영됩니다.\n목표량을 새롭게 설정하지 않을 경우 이전 목표량이 다음 날 그대로 유지됩니다.'
      );
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
    });
  };

  vm.productionStandardChange = function (e) {
    vm.productionStandardLength = e.length;
  };

  function setData() {
    let patchData = {};
    for (let i in vm.attributeKeys) {
      // 액션 생성시 만들어둔 custom.targetData[i] row전체를 additionalParams로 넘겨준다
      patchData[vm.attributeKeys[i]] = additionalParams[vm.attributeKeys[i]];
    }
    vm.editEntityFormGroup.patchValue(patchData, { emitEvent: false });
  }
  function saveAttributes(entityId) {
    let attributes = {
      productionStandard: vm.editEntityFormGroup.get('productionStandard').value,
      latestSave: moment().format('YYYY-MM-DD HH:mm:ss')
    };
    let attributesArray = [];
    for (let key in attributes) {
      attributesArray.push({ key: key, value: attributes[key] });
    }
    if (attributesArray.length > 0) {
      return attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', attributesArray);
    } else {
      return widgetContext.rxjs.of([]);
    }
  }

  function saveTelemetry(entityId) {
    let productionStandard = vm.editEntityFormGroup.get('productionStandard').value;

    if (productionStandard != undefined && productionStandard != 0) {
      let body = [
        {
          ts: moment().startOf('day').valueOf(),
          values: {
            productionStandard: productionStandard
          }
        }
      ];
      return widgetContext.http.post(
        `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}/timeseries/TELEMETRY`,
        body
      );
    } else {
      return widgetContext.rxjs.of([]);
    }
  }
}
