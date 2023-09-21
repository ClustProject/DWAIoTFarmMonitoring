const DEFAULT_CUSTOMER_LIST = [{ name: '베드 선택', id: { id: '', entityType: '' } }];
const DEFAULT_DEVICE_LIST = [
  {
    name: '포지션 선택',
    label: '포지션 선택',
    id: { id: '', entityType: '' },
  },
];

let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));

openAddEntityDialog();

function openAddEntityDialog() {
  customDialog.customDialog(htmlTemplate, AddEntityDialogController).subscribe();
}

function AddEntityDialogController(instance) {
  let vm = instance;
  // vm.currentUserAliasId = widgetContext.defaultSubscription.configuredDatasources[2].entityAliasId;
  // vm.currentUser = widgetContext.datasources.filter(x => x.entityAliasId === vm.currentUserAliasId)[0];
  // vm.currentUserName = '';
  // if (!_.isNil(vm.currentUser)) {
  //   vm.currentUserName = vm.currentUser.name;
  // }
  vm.customerList = DEFAULT_CUSTOMER_LIST;
  vm.deviceList = DEFAULT_DEVICE_LIST;

  vm.addEntityFormGroup = vm.fb.group({
    selectedCustomer: [''],
    selectedDevice: ['', [vm.validators.required]],
  });

  // changeDeviceList();

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  // 선택된 그룹에 따라 $scope.deviceList 변경
  function changeDeviceList() {
    let selectedCustomerL2 = vm.addEntityFormGroup.get('selectedCustomerL2').value;
    if (selectedCustomerL2 === '') {
      // 전체 고객사를 선택한 경우
      vm.deviceList = _.cloneDeep(widgetContext.custom.hierarchyInfo.deviceList);
    } else {
      // 개별 그룹를 선택한 경우 => 선택된 asset에 속한 device를 리스트에 복사 및 병합
      vm.deviceList = [];
      if (!_.isNil(widgetContext.custom.relations[selectedCustomerL2])) {
        vm.deviceList = _.cloneDeep(widgetContext.custom.relations[selectedCustomerL2].child);
      }
    }
    // 정렬 후 초기 리스트에 병합
    sorting(vm.deviceList, 'label', 'DESC');
    vm.deviceList = DEFAULT_DEVICE_LIST.concat(vm.deviceList);
  }

  function sorting(entityList, key, direction) {
    if (direction == 'DESC') {
      entityList.sort((a, b) => {
        if (a[key] > b[key]) return 1;
        if (a[key] < b[key]) return -1;
        return 0;
      });
    } else {
      entityList.sort((a, b) => {
        if (a[key] > b[key]) return -1;
        if (a[key] < b[key]) return 1;
        return 0;
      });
    }
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
