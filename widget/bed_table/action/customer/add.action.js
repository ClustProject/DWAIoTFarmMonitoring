// customer 대시보드 id 값 종류
const DASHBOARD_LIST = [
  {
    title: '전체 현황',
    id: '2468e5f0-92d0-11ec-8999-5bbc15768240',
    icon: 'home'
  },
  {
    title: '로봇 종합',
    id: '20db0440-92d0-11ec-8999-5bbc15768240',
    icon: 'devices_other'
  },
  {
    title: '로봇 모니터링',
    id: '1a9b4900-92d0-11ec-8999-5bbc15768240',
    icon: 'cast',
    pages: [
      {
        title: '관리 뷰',
        id: '1a9b4900-92d0-11ec-8999-5bbc15768240'
      },
      {
        title: '조업',
        id: '4d958460-92d0-11ec-8999-5bbc15768240'
      }
    ]
  },
  {
    title: '로봇 관리',
    id: '1dd78840-92d0-11ec-8999-5bbc15768240',
    icon: 'build',
    pages: [
      {
        title: '이력 관리',
        id: '1dd78840-92d0-11ec-8999-5bbc15768240'
      }
    ]
  },
  {
    title: '리포트',
    id: '5cca08c0-92d0-11ec-8999-5bbc15768240',
    icon: 'insert_chart',
    pages: [
      {
        title: '로봇 운용 리포트',
        id: '5cca08c0-92d0-11ec-8999-5bbc15768240'
      }
    ]
  },
  {
    title: '설정',
    id: '35029fa0-92d0-11ec-8999-5bbc15768240',
    icon: 'settings',
    pages: [
      {
        title: '운용 관리',
        id: '35029fa0-92d0-11ec-8999-5bbc15768240'
      },
      {
        title: '알람 관리',
        id: '740f10c0-92d0-11ec-8999-5bbc15768240'
      },
      {
        title: '리포트 관리',
        id: '39569070-92d0-11ec-8999-5bbc15768240'
      }
    ]
  }
];

const DASHBOARD_ID_LIST = [
  '2468e5f0-92d0-11ec-8999-5bbc15768240',
  '20db0440-92d0-11ec-8999-5bbc15768240',
  '1a9b4900-92d0-11ec-8999-5bbc15768240',
  '4d958460-92d0-11ec-8999-5bbc15768240',
  '1dd78840-92d0-11ec-8999-5bbc15768240',
  '5cca08c0-92d0-11ec-8999-5bbc15768240',
  '35029fa0-92d0-11ec-8999-5bbc15768240',
  '740f10c0-92d0-11ec-8999-5bbc15768240',
  '39569070-92d0-11ec-8999-5bbc15768240'
];

// 상위 커스터머로부터 가져올 server attribute
const ATTRRIBUTE_KEY_ARRAY = ['whiteLabeling'];

let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let customerService = $injector.get(widgetContext.servicesMap.get('customerService'));
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
    title: ['', [vm.validators.required]],
    managerPhone: ['', [vm.validators.required]],
    managerEmail: ['', [vm.validators.required]],
    managerName: ['', [vm.validators.required]]
  });

  vm.rootEntity = entityId;
  vm.titleLength = 0;
  vm.nameLength = 0;
  vm.phoneLength = 0;
  vm.emailLength = 0;

  // 상위 커스터머로부터 server attribute 가져옴
  attributeService.getEntityAttributes(vm.rootEntity, 'SERVER_SCOPE', ATTRRIBUTE_KEY_ARRAY).subscribe(data => {
    vm.whiteLabeling = data[0].value;
  });

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    // vm.rootEntity는 해당 device의 직속 customer
    vm.managerName = vm.addEntityFormGroup.get('managerName').value;
    vm.managerPhone = vm.addEntityFormGroup.get('managerPhone').value;
    vm.managerEmail = vm.addEntityFormGroup.get('managerEmail').value;

    vm.addEntityFormGroup.markAsPristine();
    let customer = {
      title: vm.addEntityFormGroup.get('title').value,
      customerId: vm.rootEntity,
      ownerId: vm.rootEntity,
      additionalInfo: {
        parentCustomerId: vm.rootEntity.id
      }
    };
    // 커스터머 생성
    customerService.saveCustomer(customer).subscribe(customer => {
      // 대시보드 할당 API 넣기
      let apiList = [];
      for (let i in DASHBOARD_ID_LIST) {
        apiList.push(dashboardService.assignDashboardToCustomer(customer.id.id, DASHBOARD_ID_LIST[i]));
      }
      apiList.push(saveAttributes(customer.id));
      apiList.push(saveRelation(customer.id, vm.rootEntity));
      // 커스터머에 attr, relation 설정
      widgetContext.rxjs.forkJoin(apiList).subscribe(() => {
        widgetContext.updateAliases();
        vm.dialogRef.close(null);
      });
    });
  };

  vm.titleChange = function (e) {
    vm.titleLength = e.length;
  };

  vm.nameChange = function (e) {
    vm.nameLength = e.length;
  };

  vm.phoneChange = function (e) {
    vm.phoneLength = e.length;
  };
  vm.emailChange = function (e) {
    vm.emailLength = e.length;
  };

  function saveAttributes(customerId) {
    // 커스터머 생성 시 로고 이미지를 넣은 경우
    if (vm.managerName !== '') {
      vm.whiteLabeling.managerNameImage = vm.managerName;
    }
    let attributes = {
      managerName: vm.managerName,
      managerPhone: vm.managerPhone,
      managerEmail: vm.managerEmail,
      sidemenu: { admin: DASHBOARD_LIST, general: DASHBOARD_LIST },
      whiteLabeling: vm.whiteLabeling
    };
    let attributeList = [];
    for (let key in attributes) {
      attributeList.push({ key: key, value: attributes[key] });
    }
    if (attributeList.length > 0) {
      return attributeService.saveEntityAttributes(customerId, 'SERVER_SCOPE', attributeList);
    } else {
      return widgetContext.rxjs.of([]);
    }
  }

  function saveRelation(entity, rootEntity) {
    let relation = {
      to: entity,
      from: rootEntity,
      type: 'Contains',
      typeGroup: 'COMMON'
    };
    return entityRelationService.saveRelation(relation);
  }
}
