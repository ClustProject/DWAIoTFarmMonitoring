// customer, device, asset, user service

let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let assetService = $injector.get(widgetContext.servicesMap.get('assetService'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let customerService = $injector.get(widgetContext.servicesMap.get('customerService'));
let userService = $injector.get(widgetContext.servicesMap.get('userService'));

let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));
openConnectEntityDialog();

function openConnectEntityDialog() {
  customDialog.customDialog(htmlTemplate, connectEntityDialogController).subscribe();
}

function connectEntityDialogController(instance) {
  let vm = instance;

  if (additionalParams == 'true') {
    vm.content1 = '원격 접속을 종료하시겠습니까?';
    vm.content2 = '종료하시면 담당 IndyPD가 해당 로봇에 원격 접속할 수 없습니다.';
    vm.buttonName = '종료';
  } else {
    vm.content1 = '원격 접속을 승인하시겠습니까?';
    vm.content2 = '승인하시면 담당 IndyPD가 해당 로봇에 원격 접속할 수 있습니다.';
    vm.buttonName = '승인';
  }

  vm.connectEntityFormGroup = vm.fb.group({});

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    saveAttributes().subscribe(() => {
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
    });
  };

  function saveAttributes() {
    let attributesArray = [];
    if (additionalParams == 'true') {
      attributesArray.push({ key: 'remoteConnection', value: false });
    } else {
      attributesArray.push({ key: 'remoteConnection', value: true });
    }

    if (attributesArray.length > 0) {
      return attributeService.saveEntityAttributes(entityId, 'SHARED_SCOPE', attributesArray);
    } else {
      return widgetContext.rxjs.of([]);
    }
  }
}
