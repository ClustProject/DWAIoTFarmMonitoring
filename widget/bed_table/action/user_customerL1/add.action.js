const DEFAULT_DASHBOARD_ID = '9412b6b0-92d0-11ec-8999-5bbc15768240'; // 전체 현황 대시보드

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
    firstName: ['', [vm.validators.required]],
    email: ['', [vm.validators.required]],
    phone: ['']
  });

  vm.rootEntity = entityId;

  vm.firstNameLength = 0;
  vm.emailLength = 0;
  vm.phoneLength = 0;

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    // vm.rootEntity는 User가 소속될 Customer
    vm.addEntityFormGroup.markAsPristine();
    let user = {
      firstName: vm.addEntityFormGroup.get('firstName').value,
      email: vm.addEntityFormGroup.get('email').value, // 필수
      customerId: vm.rootEntity, // 필수
      ownerId: vm.rootEntity,
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
      apiList.push(saveRelation(user.id, vm.rootEntity));
      apiList.push(userService.getActivationLink(user.id.id));
      // 유저 attr, relation 설정
      widgetContext.rxjs.forkJoin(apiList).subscribe(result => {
        // window.open(result[2]);
        widgetContext.updateAliases();
        vm.dialogRef.close(null);
      });
    });
  };

  vm.firstNameChange = function (e) {
    vm.firstNameLength = e.length;
  };

  vm.emailChange = function (e) {
    vm.emailLength = e.length;
  };

  vm.phoneChange = function (e) {
    vm.phoneLength = e.length;
  };

  function saveAttributes(userId) {
    let attributes = {
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
