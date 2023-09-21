let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));

openEditDeviceDialog();

function openEditDeviceDialog() {
  customDialog.customDialog(htmlTemplate, EditDeviceDialogController).subscribe();
}

function EditDeviceDialogController(instance) {
  let vm = instance;

  vm.entityLabel = entityLabel;
  vm.attributes = {};
  vm.attributeKeys = ['customerName', 'label', 'robotType', 'name', 'manufactureDate'];
  vm.robotTypeList = ['Indy7', 'Indy12', 'IndyRP2', 'IndyEye'];

  vm.editEntityFormGroup = vm.fb.group({
    customerName: ['', [vm.validators.required]],
    label: ['', [vm.validators.required]],
    robotType: ['', [vm.validators.required]],
    name: ['', [vm.validators.required]],
    manufactureDate: ['', [vm.validators.required]]
  });

  vm.labelLength = additionalParams.label.length;
  vm.nameLength = additionalParams.name.length;

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

    vm.device.type = 'Neuromeka';
    vm.device.customerId = vm.parentEntity; // 필수가 아님 tenantId 선언해주면 대체 가능!
    vm.device.ownerId = vm.parentEntity;

    delete vm.device.deviceProfileId; // 디바이스 타입 변경하려면 제거해야함
    // delete vm.device.deviceData; // 이건 상관없는듯함

    // 미지정일 때 예외 처리
    if (vm.parentEntity.id === 'unapplied') {
      delete vm.device.customerId;
      delete vm.device.ownerId; // 이거하면 할당 사라짐!
      vm.device.type = 'default';
    }

    vm.editEntityFormGroup.markAsPristine();
    vm.device.label = vm.editEntityFormGroup.get('label').value;
    vm.device.name = vm.editEntityFormGroup.get('name').value;

    let apiList = [];
    apiList.push(saveAttributes(entityId));
    apiList.push(deviceService.saveDevice(vm.device));

    // 원래 커스터머가 미지정이 아닐 때
    if (vm.originParentId !== undefined && vm.originParentId.id !== 'unapplied') {
      apiList.push(entityRelationService.deleteRelation(vm.originParentId, 'Contains', entityId)); // 기존 관계 전부 제거
    }
    // 미지정일 때 예외 처리
    if (vm.parentEntity.id !== 'unapplied') {
      apiList.push(saveRelation(entityId, vm.parentEntity));
    }
    widgetContext.rxjs.forkJoin(apiList).subscribe(() => {
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
    });
  };

  vm.setStartDate = function (e) {
    vm.manufactureDate = moment(e.value).startOf('day').toDate();
    vm.editEntityFormGroup.patchValue(
      { manufactureDate: moment(vm.manufactureDate).format('YYYY-MM-DD') },
      { emitEvent: false }
    );
    // 날짜 선택 시 patchValue 방식이라 값이 바뀐 것으로 인식 못하는 예외 처리
    vm.editEntityFormGroup.markAsDirty();
  };

  vm.labelChange = function (e) {
    vm.labelLength = e.length;
  };

  vm.nameChange = function (e) {
    vm.nameLength = e.length;
  };

  function makeList() {
    vm.customerList = [];

    let rootEntity = widgetContext.defaultSubscription.configuredDatasources[0].entityFilter.rootEntity;
    // entityId는 최상위 루트 엔터티
    widgetContext.http
      .get(`/api/relations/info?fromId=${rootEntity.id}&fromType=${rootEntity.entityType}`)
      .subscribe(data => {
        for (let i = 0; i < data.length; i++) {
          if (data[i].to.entityType == 'CUSTOMER') {
            vm.customerList.push({ name: data[i].toName, id: data[i].to });
          }
        }
        vm.customerList.unshift({ name: '미지정', id: { id: 'unapplied', entityType: 'CUSTOMER' } });

        setData();
      });
  }

  function setData() {
    // device entity 정보 요청 API 해당 포맷으로 저장하기 위해 필요 ( ID, label, email만 넣으면 obj 포맷 오류 발생 )
    deviceService.getDevice(entityId.id).subscribe(function (device) {
      vm.device = device;

      let patchData = {};
      for (let i in vm.attributeKeys) {
        // 액션 생성시 만들어둔 custom.targetData[i] row전체를 additionalParams로 넘겨준다
        patchData[vm.attributeKeys[i]] = additionalParams[vm.attributeKeys[i]];
      }

      // 미지정 예외 처리
      for (let i in vm.customerList) {
        if (patchData['customerName'] == vm.customerList[i].name) {
          patchData['customerName'] = vm.customerList[i].id.id;
          vm.originParentId = vm.customerList[i].id;
        }
      }

      vm.editEntityFormGroup.patchValue(patchData, { emitEvent: false });
    });
  }

  function saveAttributes(entityId) {
    let attributes = {
      customerName: vm.parentName,
      robotType: vm.editEntityFormGroup.get('robotType').value,
      manufactureDate: vm.editEntityFormGroup.get('manufactureDate').value
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
