let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let userService = $injector.get(widgetContext.servicesMap.get('userService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));

openEditEntityDialog();

function openEditEntityDialog() {
  customDialog.customDialog(htmlTemplate, EditEntityDialogController).subscribe();
}

function EditEntityDialogController(instance) {
  let vm = instance;

  vm.entityName = entityName;
  vm.attributes = {};
  vm.attributeKeys = ['firstName', 'email', 'phone'];

  vm.editEntityFormGroup = vm.fb.group({
    firstName: ['', [vm.validators.required]],
    email: ['', [vm.validators.required]],
    phone: ['']
  });

  vm.firstNameLength = additionalParams.firstName.length;
  vm.emailLength = additionalParams.email.length;
  vm.phoneLength = additionalParams.phone.length;

  setData();

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    vm.editEntityFormGroup.markAsPristine();
    vm.user.firstName = vm.editEntityFormGroup.get('firstName').value;
    vm.user.email = vm.editEntityFormGroup.get('email').value;
    widgetContext.rxjs.forkJoin([saveAttributes(entityId), userService.saveUser(vm.user)]).subscribe(() => {
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
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

  function setData() {
    // user entity 정보 요청 API 해당 포맷으로 저장하기 위해 필요 ( ID, firstName, email만 넣으면 obj 포맷 오류 발생 )
    userService.getUser(entityId.id).subscribe(function (user) {
      vm.user = user;

      let patchData = {};
      for (let i in vm.attributeKeys) {
        // 액션 생성시 만들어둔 custom.targetData[i] row전체를 additionalParams로 넘겨준다
        patchData[vm.attributeKeys[i]] = additionalParams[vm.attributeKeys[i]];
      }
      vm.editEntityFormGroup.patchValue(patchData, { emitEvent: false });
    });
  }
  function saveAttributes(entityId) {
    let attributes = {
      phone: vm.editEntityFormGroup.get('phone').value
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
}
