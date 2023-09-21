// customer, device, asset, user service

let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let assetService = $injector.get(widgetContext.servicesMap.get('assetService'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let customerService = $injector.get(widgetContext.servicesMap.get('customerService'));
let userService = $injector.get(widgetContext.servicesMap.get('userService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));

openDeleteEntityDialog();

function openDeleteEntityDialog() {
  customDialog.customDialog(htmlTemplate, DeleteEntityDialogController).subscribe();
}

function DeleteEntityDialogController(instance) {
  let vm = instance;

  let key = additionalParams.key;
  let active = additionalParams.active;
  let label = additionalParams.label;

  if (active == 'true') {
    vm.title = '환경 예측 정지';
    vm.content = "'" + label + "' " + '을 정지하시겠습니까?';
    vm.controlBtn = '정지';
  } else {
    vm.title = '환경 예측 가동';
    vm.content = "'" + label + "' " + '을 가동하시겠습니까?';
    vm.controlBtn = '가동';
  }

  vm.deleteEntityFormGroup = vm.fb.group({});

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    saveAttributes().subscribe(() => {
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
    });
  };
}

function saveAttributes() {
  let attributesArray = [{ key: additionalParams.key, value: additionalParams.active == 'true' ? 'false' : 'true' }];

  if (attributesArray.length > 0) {
    return attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', attributesArray);
  } else {
    return widgetContext.rxjs.of([]);
  }
}

function t(key, data) {
  let defaultKey = key;
  if (typeof key === 'string') {
    let keyArr = key.split('.');
    defaultKey = keyArr[keyArr.length - 1];
  }
  let result = widgetContext.translate.instant(key, data);
  if (result == key) {
    return defaultKey;
  }
  return result;
}
