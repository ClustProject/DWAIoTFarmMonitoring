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

  vm.attributeKeys = ['customerName', 'label', 'robotType', 'name', 'manufactureDate'];
  vm.robotTypeList = ['Indy7', 'Indy12', 'IndyRP2', 'IndyEye'];

  vm.addEntityFormGroup = vm.fb.group({
    customerName: ['', [vm.validators.required]],
    label: ['', [vm.validators.required]],
    robotType: ['', [vm.validators.required]],
    name: ['', [vm.validators.required]],
    manufactureDate: ['', [vm.validators.required]]
  });

  vm.labelLength = 0;
  vm.nameLength = 0;

  makeList();

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    for (let i in vm.customerList) {
      if (vm.selectedCustomer == vm.customerList[i].id.id) {
        vm.parentEntity = vm.customerList[i].id;
        vm.parentName = vm.customerList[i].name;
      }
    }

    // vm.parentEntity는 Device가 소속될 Customer
    vm.addEntityFormGroup.markAsPristine();
    let device = {
      name: vm.addEntityFormGroup.get('name').value,
      type: 'Neuromeka',
      label: vm.addEntityFormGroup.get('label').value,
      customerId: vm.parentEntity, // 필수가 아님 tenantId 선언해주면 대체 가능!
      ownerId: vm.parentEntity

      // tenantId?: TenantId,
      // customerId?: CustomerId,
      // firmwareId?: OtaPackageId,
      // softwareId?: OtaPackageId,
      // deviceProfileId?: DeviceProfileId,
      // deviceData?: DeviceData,
      // additionalInfo?: any,
    };

    // 미지정일 때 예외 처리
    if (vm.parentEntity.id === 'unapplied') {
      delete device.customerId;
      delete device.ownerId;
      device.type = 'default';
      device.tenantId = {
        id: '8340a8e0-015a-11ec-a6f2-d568cce22849',
        entityType: 'TENANT'
      };
    }

    //
    deviceService.saveDevice(device).subscribe(device => {
      // 대시보드 할당 API 넣기
      let apiList = [];
      apiList.push(saveAttributes(device.id));
      // 미지정일 때 예외 처리
      if (vm.parentEntity.id !== 'unapplied') {
        apiList.push(saveRelation(device.id, vm.parentEntity));
      }
      // 유저 attr, relation 설정
      widgetContext.rxjs.forkJoin(apiList).subscribe(result => {
        widgetContext.updateAliases();
        vm.dialogRef.close(null);
      });
    });
  };

  vm.setStartDate = function (e) {
    vm.manufactureDate = moment(e.value).startOf('day').toDate();
    vm.addEntityFormGroup.patchValue(
      { manufactureDate: moment(vm.manufactureDate).format('YYYY-MM-DD') },
      { emitEvent: false }
    );
    // 날짜 선택 시 patchValue 방식이라 값이 바뀐 것으로 인식 못하는 예외 처리
    vm.addEntityFormGroup.markAsDirty();
  };

  vm.labelChange = function (e) {
    vm.labelLength = e.length;
  };

  vm.nameChange = function (e) {
    vm.nameLength = e.length;
  };

  function makeList() {
    vm.customerList = [];
    // entityId는 최상위 루트 엔터티
    widgetContext.http
      .get(`/api/relations/info?fromId=${entityId.id}&fromType=${entityId.entityType}`)
      .subscribe(data => {
        for (let i = 0; i < data.length; i++) {
          if (data[i].to.entityType == 'CUSTOMER') {
            vm.customerList.push({ name: data[i].toName, id: data[i].to });
          }
        }
        vm.customerList.unshift({ name: '미지정', id: { id: 'unapplied', entityType: 'CUSTOMER' } });
      });
  }

  function saveAttributes(deviceId) {
    let attributes = {
      customerName: vm.parentName,
      robotType: vm.addEntityFormGroup.get('robotType').value,
      manufactureDate: vm.addEntityFormGroup.get('manufactureDate').value
    };
    let attributeList = [];
    for (let key in attributes) {
      attributeList.push({ key: key, value: attributes[key] });
    }
    if (attributeList.length > 0) {
      return attributeService.saveEntityAttributes(deviceId, 'SERVER_SCOPE', attributeList);
    } else {
      return widgetContext.rxjs.of([]);
    }
  }

  function saveRelation(entity, parentEntity) {
    let relation = {
      to: entity,
      from: parentEntity,
      type: 'Contains',
      typeGroup: 'COMMON'
    };
    return entityRelationService.saveRelation(relation);
  }
}
