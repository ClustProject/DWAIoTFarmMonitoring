let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let customerService = $injector.get(widgetContext.servicesMap.get('customerService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));

openEditEntityDialog();

function openEditEntityDialog() {
  customDialog.customDialog(htmlTemplate, EditEntityDialogController).subscribe();
}

function EditEntityDialogController(instance) {
  let vm = instance;

  vm.entityName = entityName;
  vm.attributes = {};
  vm.attributeKeys = ['managerName', 'managerPhone', 'managerEmail'];

  vm.editEntityFormGroup = vm.fb.group({
    title: ['', [vm.validators.required]],
    managerPhone: ['', [vm.validators.required]],
    managerEmail: ['', [vm.validators.required]],
    managerName: ['', [vm.validators.required]]
  });

  vm.titleLength = additionalParams.title.length;
  vm.nameLength = additionalParams.managerName.length;
  vm.phoneLength = additionalParams.managerPhone.length;
  vm.emailLength = additionalParams.managerEmail.length;

  setData();

  vm.cancel = function () {
    vm.dialogRef.close(null);
  };

  vm.save = function () {
    vm.editEntityFormGroup.markAsPristine();
    vm.customer.title = vm.editEntityFormGroup.get('title').value;
    widgetContext.rxjs.forkJoin([saveAttributes(entityId), customerService.saveCustomer(vm.customer)]).subscribe(() => {
      widgetContext.updateAliases();
      vm.dialogRef.close(null);
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

  function setData() {
    // 커스터머 entity 정보 요청 API 해당 포맷으로 저장하기 위해 필요
    customerService.getCustomer(entityId.id).subscribe(function (customer) {
      vm.customer = customer;

      let patchData = {};
      patchData.title = vm.customer.title;
      for (let i in vm.attributeKeys) {
        // 액션 생성시 만들어둔 custom.targetData[i] row전체를 additionalParams로 넘겨준다
        patchData[vm.attributeKeys[i]] = additionalParams[vm.attributeKeys[i]];
      }
      vm.editEntityFormGroup.patchValue(patchData, { emitEvent: false });
    });
  }
  function saveAttributes(entityId) {
    let attributes = {
      managerName: vm.editEntityFormGroup.get('managerName').value,
      managerPhone: vm.editEntityFormGroup.get('managerPhone').value,
      managerEmail: vm.editEntityFormGroup.get('managerEmail').value
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
