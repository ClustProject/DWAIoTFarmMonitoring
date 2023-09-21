let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));
let dashboardService = $injector.get(widgetContext.servicesMap.get('dashboardService'));

openAddDeviceDialog();

function openAddDeviceDialog() {
  customDialog.customDialog(htmlTemplate, AddDeviceDialogController).subscribe();
}

function AddDeviceDialogController(instance) {
  let vm = instance;

  vm.addEntityFormGroup = vm.fb.group({
    deviceLabel: [''],
    startDate: ['', [vm.validators.required]],
    endDate: ['', [vm.validators.required]],
  });

  let custom = widgetContext.custom;
  let $scope = widgetContext.$scope;

  vm.deviceList = $scope.deviceList;
  vm.selectedDevice = $scope.selectedDevice;

  vm.addEntityFormGroup.patchValue({ startDate: moment(custom.startTs).format('YYYY-MM-DD') }, { emitEvent: false });
  vm.addEntityFormGroup.patchValue({ endDate: moment(custom.endTs).format('YYYY-MM-DD') }, { emitEvent: false });
  vm.addEntityFormGroup.markAsDirty();

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    $scope.search();

    vm.dialogRef.close(null);
  };

  vm.changeDevice = function ($event) {
    $scope.selectedDevice = $event.value;
  };

  vm.setStartDate = function (e) {
    custom.startTs = moment(e.value).startOf('day').valueOf();
    vm.startDate = moment(e.value).startOf('day').toDate();
    vm.addEntityFormGroup.patchValue({ startDate: moment(vm.startDate).format('YYYY-MM-DD') }, { emitEvent: false });
    // 날짜 선택 시 patchValue 방식이라 값이 바뀐 것으로 인식 못하는 예외 처리
    vm.addEntityFormGroup.markAsDirty();
  };

  vm.setEndDate = function (e) {
    custom.endTs = moment(e.value).endOf('day').valueOf();
    vm.endDate = moment(e.value).endOf('day').toDate();
    vm.addEntityFormGroup.patchValue({ endDate: moment(vm.endDate).format('YYYY-MM-DD') }, { emitEvent: false });
    // 날짜 선택 시 patchValue 방식이라 값이 바뀐 것으로 인식 못하는 예외 처리
    vm.addEntityFormGroup.markAsDirty();
  };

  vm.yearSelect = function (e) {
    console.log(e);
  };

  vm.monthSelect = function (e) {
    console.log(e);
  };

  vm.labelChange = function (e) {
    vm.labelLength = e.length;
  };

  vm.nameChange = function (e) {
    vm.nameLength = e.length;
  };
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

function sorting(entityList, sortKey) {
  // sorting
  entityList.sort((a, b) => {
    if (a[sortKey] == b[sortKey]) {
      return 0;
    } else if (b[sortKey] < a[sortKey]) {
      return 1;
    } else if (a[sortKey] < b[sortKey]) {
      return -1;
    }
  });
}
