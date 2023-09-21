let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let assetService = $injector.get(widgetContext.servicesMap.get('assetService'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));

const t = widgetContext.custom.t;

openAddEntityDialog();

function openAddEntityDialog() {
  customDialog.customDialog(htmlTemplate, AddEntityDialogController).subscribe();
}

function AddEntityDialogController(instance) {
  let vm = instance;
  vm.ownerId = widgetContext.defaultSubscription.configuredDatasources[0].entity.id;
  vm.ownerLevel = widgetContext.$scope.ownerLevel;
  vm.t = t;
  vm.currentStep = 0;
  vm.newEmail = '';
  vm.emailList = [];
  vm.customerL1List = [{ name: t('thingplus.selector.entire-customerL1'), value: '' }];
  vm.customerL2List = [{ name: t('thingplus.selector.entire-customerL2'), value: '' }];
  if (vm.ownerLevel == 0) {
    vm.customerL1List = vm.customerL1List.concat(
      widgetContext.custom.customerL1List
        .map(x => {
          return {
            name: x.name,
            value: x.id.id,
          };
        })
        .sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
          return 0;
        })
    );
  }
  if (vm.ownerLevel <= 1) {
    vm.customerL2List = vm.customerL2List.concat(
      widgetContext.custom.customerL2List
        .map(x => {
          return {
            name: x.name,
            value: x.id.id,
          };
        })
        .sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
          return 0;
        })
    );
  }
  vm.dayList = [
    { name: t('thingplus.time-format.weekday-long.mon'), value: 0 },
    { name: t('thingplus.time-format.weekday-long.tue'), value: 1 },
    { name: t('thingplus.time-format.weekday-long.wed'), value: 2 },
    { name: t('thingplus.time-format.weekday-long.thr'), value: 3 },
    { name: t('thingplus.time-format.weekday-long.fri'), value: 4 },
    { name: t('thingplus.time-format.weekday-long.sat'), value: 5 },
    { name: t('thingplus.time-format.weekday-long.sun'), value: 6 },
  ];
  vm.dateList = [];
  for (let i = 1; i <= 31; i++) {
    vm.dateList.push({ name: t('thingplus.time-format.day-value', { day: i }), value: i });
  }
  let defaultCustomerL1Name = widgetContext.custom.relations[entityId.id].parent
    ? widgetContext.custom.relations[entityId.id].parent.name
    : entityName;
  vm.addEntityFormGroup = vm.fb.group({
    customerL1Name: [defaultCustomerL1Name],
    customerL2Name: [entityName],
    reportType: ['DAILY'],
    reportTime: [moment().toDate()],
    dailyContent: vm.fb.group({
      0: [true],
      1: [true],
      2: [true],
      3: [true],
      4: [true],
      5: [true],
      6: [true],
    }),
    weeklyContent: [0],
    monthlyContent: [1],
    customContent: [2],
    newEmail: [''],
  });
  if (vm.ownerLevel == 0) {
    vm.addEntityFormGroup.controls.customerL1 = vm.fb.control('');
  }
  if (vm.ownerLevel <= 1) {
    vm.addEntityFormGroup.controls.customerL2 = vm.fb.control('');
  }

  vm.calcFontSize = function () {
    const originWidth = widgetContext.settings.widget.originWidth;
    let widgetFontSize = _.round((widgetContext.width / originWidth) * 10, 2);
    if (widgetFontSize < 6.25) {
      widgetFontSize = 6.25;
    }
    return widgetFontSize;
  };
  vm.cancel = function () {
    vm.dialogRef.close(null);
  };
  vm.save = function () {
    vm.addEntityFormGroup.markAsPristine();
    if (vm.emailList.length == 0) {
      window.alert(t('thingplus.help.error-required-receiver'));
      return;
    }
    saveAsset().subscribe(asset => {
      widgetContext.rxjs
        .forkJoin([changeName(asset), assignAsset(asset), saveRelation(asset), saveAttribute(asset)])
        .subscribe(() => {
          widgetContext.updateAliases();
          vm.dialogRef.close(null);
        });
    });
  };
  vm.selectStep = function (e, index) {
    vm.currentStep = index;
  };
  vm.prevStep = function () {
    vm.currentStep--;
  };
  vm.nextStep = function () {
    vm.currentStep++;
  };
  vm.setCustomerL1 = function (e) {
    let customerL1 = vm.addEntityFormGroup.get('customerL1').value;
    vm.customerL2List = [{ name: t('thingplus.selector.entire-customerL2'), value: '' }];
    vm.addEntityFormGroup.patchValue(
      {
        customerL2: '',
      },
      { emitEvent: false }
    );
    vm.customerL2List = vm.customerL2List.concat(
      widgetContext.custom.customerL2List
        .filter(x => {
          return customerL1 == '' || x.parent.id.id == customerL1;
        })
        .map(x => {
          return {
            name: x.name,
            value: x.id.id,
          };
        })
        .sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
          return 0;
        })
    );
  };
  vm.setReportType = function (e, type) {
    vm.addEntityFormGroup.patchValue(
      {
        reportType: type,
      },
      { emitEvent: false }
    );
  };
  vm.addEmail = function (e) {
    let newEmail = vm.addEntityFormGroup.get('newEmail');
    if (newEmail.hasError('email')) return;
    if (newEmail.value != '') {
      vm.emailList.push(newEmail.value);
      vm.addEntityFormGroup.patchValue(
        {
          newEmail: '',
        },
        { emitEvent: false }
      );
    }
  };
  vm.deleteEmail = function (e, email) {
    let targetIndex = vm.emailList.indexOf(email);
    vm.emailList.splice(targetIndex, 1);
  };

  function saveAsset() {
    let name = moment().valueOf() + '-' + Math.floor(1000000000000 * Math.random());
    let body = {
      name: name,
      type: 'report',
    };
    return assetService.saveAsset(body);
  }
  function changeName(asset) {
    asset.name = asset.id.id;
    return assetService.saveAsset(asset);
  }

  function assignAsset(asset) {
    if (vm.ownerLevel > 0) {
      return assetService.assignAssetToCustomer(entityId.id, asset.id.id);
    } else {
      return widgetContext.rxjs.of([]);
    }
  }

  function saveRelation(asset) {
    let relationBody = {
      from: entityId,
      to: asset.id,
      type: 'Contains',
    };
    return entityRelationService.saveRelation(relationBody);
  }

  function saveAttribute(asset) {
    let customerL1Id = '',
      customerL2Id = '';
    if (vm.ownerLevel == 0) {
      customerL1Id = vm.addEntityFormGroup.get('customerL1').value;
      customerL2Id = vm.addEntityFormGroup.get('customerL2').value;
    } else if (vm.ownerLevel == 1) {
      customerL1Id = entityId.id;
      customerL2Id = vm.addEntityFormGroup.get('customerL2').value;
    } else {
      customerL2Id = entityId.id;
      customerL1Id = widgetContext.custom.relations[customerL2Id].parent.id.id;
    }
    let reportType = vm.addEntityFormGroup.get('reportType').value;
    let reportTime = vm.addEntityFormGroup.get('reportTime').value;
    reportTime = moment(reportTime).hour() * 3600000 + moment(reportTime).minute() * 60000;
    let reportContent = '';
    if (reportType == 'DAILY') {
      reportContent = vm.addEntityFormGroup.get('dailyContent').value;
      let result = [];
      for (let i in reportContent) {
        if (reportContent[i]) {
          result.push(i);
        }
      }
      reportContent = result.join(',');
    } else if (reportType == 'WEEKLY') {
      reportContent = vm.addEntityFormGroup.get('weeklyContent').value;
    } else if (reportType == 'MONTHLY') {
      reportContent = vm.addEntityFormGroup.get('monthlyContent').value;
    } else {
      reportContent = vm.addEntityFormGroup.get('customContent').value;
    }
    let reportPage = [
      {
        dashboardId: widgetContext.custom.dashboardList['Report'].id.id,
        stateId: 'default',
      },
    ];

    let attributeBody = [
      { key: 'customerL1', value: customerL1Id },
      { key: 'customerL2', value: customerL2Id },
      { key: 'reportType', value: reportType },
      { key: 'reportTime', value: reportTime },
      { key: 'reportContent', value: reportContent },
      { key: 'reportPage', value: reportPage },
      { key: 'reportUpdateTime', value: moment().valueOf() },
      { key: 'receiver', value: vm.emailList.join(',') },
    ];
    return attributeService.saveEntityAttributes(asset.id, 'SERVER_SCOPE', attributeBody);
  }
}
