// customer, device, asset, user service

let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let assetService = $injector.get(widgetContext.servicesMap.get('assetService'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let customerService = $injector.get(widgetContext.servicesMap.get('customerService'));
let userService = $injector.get(widgetContext.servicesMap.get('userService'));

openDeleteEntityDialog();

function openDeleteEntityDialog() {
  customDialog.customDialog(htmlTemplate, DeleteEntityDialogController).subscribe();
}

function DeleteEntityDialogController(instance) {
  let vm = instance;

  if (entityId.entityType == 'ASSET') {
    vm.entityType = '에셋';
  } else if (entityId.entityType == 'DEVICE') {
    vm.entityType = '로봇';
  } else if (entityId.entityType == 'CUSTOMER') {
    vm.entityType = '고객사';
  } else if (entityId.entityType == 'USER') {
    vm.entityType = '계정';
  }
  vm.title = entityName;
  vm.deleteEntityFormGroup = vm.fb.group({});

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    if (additionalParams.author !== vm.currentUserName) {
      window.alert('삭제 권한이 없습니다.');
      return;
    }
    deleteEntity().subscribe(() => {
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
    });
  };
}

function deleteEntity() {
  if (entityId.entityType == 'ASSET') {
    return assetService.deleteAsset(entityId.id);
  } else if (entityId.entityType == 'DEVICE') {
    return deviceService.deleteDevice(entityId.id);
  } else if (entityId.entityType == 'CUSTOMER') {
    return customerService.deleteCustomer(entityId.id);
  } else if (entityId.entityType == 'USER') {
    return userService.deleteUser(entityId.id);
  }
}
