const DEFAULT_DASHBOARD_ID = '2468e5f0-92d0-11ec-8999-5bbc15768240'; // 전체 현황 대시보드

let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let userService = $injector.get(widgetContext.servicesMap.get('userService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));
let dashboardService = $injector.get(widgetContext.servicesMap.get('dashboardService'));

openAddUserDialog();

function openAddUserDialog() {
  customDialog.customDialog(htmlTemplate, AddUserDialogController).subscribe();
}

function AddUserDialogController(instance) {
  let vm = instance;

  vm.addEntityFormGroup = vm.fb.group({
    customerName: ['', [vm.validators.required]],
    firstName: ['', [vm.validators.required]],
    department: [''],
    position: [''],
    email: ['', [vm.validators.required]],
    phone: ['']
  });

  vm.firstNameLength = 0;
  vm.departmentLength = 0;
  vm.positionLength = 0;
  vm.emailLength = 0;
  vm.phoneLength = 0;

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

    // vm.parentEntity는 User가 소속될 Customer
    vm.addEntityFormGroup.markAsPristine();
    let user = {
      firstName: vm.addEntityFormGroup.get('firstName').value,
      email: vm.addEntityFormGroup.get('email').value, // 필수
      customerId: vm.parentEntity, // 필수
      ownerId: vm.parentEntity,
      additionalInfo: {
        defaultDashboardId: DEFAULT_DASHBOARD_ID, // 기본 대시보드 설정
        defaultDashboardFullscreen: false, // 전체화면 옵션
        userAuthority: 'admin' // 쓰기 권한
      }, // 필수
      authority: 'CUSTOMER_USER' // 필수 'SYS_ADIMN'은 권한 문제 발생
    };
    //
    userService.saveUser(user).subscribe(user => {
      // 대시보드 할당 API 넣기
      let apiList = [];
      apiList.push(saveAttributes(user.id));
      apiList.push(saveRelation(user.id, vm.parentEntity));
      // 유저 attr, relation 설정
      widgetContext.rxjs.forkJoin(apiList).subscribe(result => {
        widgetContext.updateAliases();
        vm.dialogRef.close(null);
      });
    });
  };

  vm.firstNameChange = function (e) {
    vm.firstNameLength = e.length;
  };
  vm.departmentChange = function (e) {
    vm.departmentLength = e.length;
  };
  vm.positionChange = function (e) {
    vm.positionLength = e.length;
  };
  vm.emailChange = function (e) {
    vm.emailLength = e.length;
  };
  vm.phoneChange = function (e) {
    vm.phoneLength = e.length;
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
      });
  }

  function saveAttributes(userId) {
    let attributes = {
      customerName: vm.parentName,
      department: vm.addEntityFormGroup.get('department').value,
      position: vm.addEntityFormGroup.get('position').value,
      phone: vm.addEntityFormGroup.get('phone').value
    };
    let attributeList = [];
    for (let key in attributes) {
      attributeList.push({ key: key, value: attributes[key] });
    }
    if (attributeList.length > 0) {
      return attributeService.saveEntityAttributes(userId, 'SERVER_SCOPE', attributeList);
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
